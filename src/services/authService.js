import { supabase } from "./supabase";

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

const COMMON_EMAIL_DOMAIN_TYPOS = {
  "gmai.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.co": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "outlok.com": "outlook.com",
  "outllook.com": "outlook.com",
  "hotmal.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
};

const getEmailRedirectUrl = () => {
  return `${window.location.origin}/login?email_verified=true`;
};

const normalizeAndValidateEmail = (
  rawEmail
) => {
  const normalizedEmail =
    rawEmail
      ?.trim()
      .toLowerCase();

  if (!normalizedEmail) {
    throw new Error(
      "Email address is required."
    );
  }

  if (
    normalizedEmail.length > 254 ||
    !EMAIL_PATTERN.test(
      normalizedEmail
    )
  ) {
    throw new Error(
      "Enter a valid email address."
    );
  }

  const domain =
    normalizedEmail
      .split("@")
      .pop();

  const suggestedDomain =
    COMMON_EMAIL_DOMAIN_TYPOS[
      domain
    ];

  if (suggestedDomain) {
    throw new Error(
      `The email domain "${domain}" appears incorrect. Did you mean "${suggestedDomain}"?`
    );
  }

  return normalizedEmail;
};

/*
=====================================
REGISTER
=====================================
*/

export async function registerUser(formData) {
  const fullName =
    formData.full_name?.trim();

  const email =
    normalizeAndValidateEmail(
      formData.email
    );

  const role = formData.role;

  const studentNumber =
    formData.student_number?.trim();

  const employeeId =
    formData.employee_id?.trim();

  const yearLevel =
    formData.year_level?.trim();

  const schoolYear =
    formData.school_year?.trim();

  const semester =
    formData.semester?.trim();

  const block =
    formData.section
      ?.trim()
      .toUpperCase();

  /*
  =====================================
  GENERAL VALIDATION
  =====================================
  */

  if (!fullName) {
    throw new Error(
      "Full name is required."
    );
  }

  if (
    !formData.password ||
    formData.password.length < 6
  ) {
    throw new Error(
      "Password must contain at least 6 characters."
    );
  }

  if (
    !["Student", "Approver"].includes(
      role
    )
  ) {
    throw new Error(
      "Invalid account type."
    );
  }

  /*
  =====================================
  STUDENT VALIDATION
  =====================================
  */

  if (role === "Student") {
    if (!studentNumber) {
      throw new Error(
        "Student Number is required."
      );
    }

    if (!formData.course_id) {
      throw new Error(
        "Course is required."
      );
    }

    if (
      ![
        "1st Year",
        "2nd Year",
        "3rd Year",
        "4th Year",
      ].includes(yearLevel)
    ) {
      throw new Error(
        "Please select a valid year level."
      );
    }

    const schoolYearMatch =
      schoolYear?.match(
        /^(\d{4})-(\d{4})$/
      );

    if (!schoolYearMatch) {
      throw new Error(
        "Please select a valid school year."
      );
    }

    const schoolYearStart =
      Number(schoolYearMatch[1]);

    const schoolYearEnd =
      Number(schoolYearMatch[2]);

    if (
      schoolYearEnd !==
      schoolYearStart + 1
    ) {
      throw new Error(
        "Invalid school year format."
      );
    }

    if (
      ![
        "1st Semester",
        "2nd Semester",
        "Summer",
      ].includes(semester)
    ) {
      throw new Error(
        "Please select a valid semester."
      );
    }

    if (!block) {
      throw new Error(
        "Block is required."
      );
    }
  }

  /*
  =====================================
  APPROVER VALIDATION
  =====================================
  */

  if (
    role === "Approver" &&
    !employeeId
  ) {
    throw new Error(
      "Employee ID is required."
    );
  }

  /*
  =====================================
  CHECK STUDENT NUMBER
  =====================================
  */

  if (role === "Student") {
    const {
      data: existingStudent,
      error: studentCheckError,
    } = await supabase
      .from("users")
      .select("id")
      .eq(
        "student_id",
        studentNumber
      )
      .maybeSingle();

    if (studentCheckError) {
      throw studentCheckError;
    }

    if (existingStudent) {
      throw new Error(
        "Student Number is already registered."
      );
    }
  }

  /*
  =====================================
  CHECK EMPLOYEE ID
  =====================================
  */

  if (role === "Approver") {
    const {
      data: existingEmployee,
      error: employeeCheckError,
    } = await supabase
      .from("users")
      .select("id")
      .eq(
        "employee_id",
        employeeId
      )
      .maybeSingle();

    if (employeeCheckError) {
      throw employeeCheckError;
    }

    if (existingEmployee) {
      throw new Error(
        "Employee ID is already registered."
      );
    }
  }

  /*
  =====================================
  CHECK EMAIL
  =====================================
  */

  const {
    data: existingEmail,
    error: emailCheckError,
  } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (emailCheckError) {
    throw emailCheckError;
  }

  if (existingEmail) {
    throw new Error(
      "Email is already registered."
    );
  }

  /*
  =====================================
  VALIDATE SELECTED COURSE
  =====================================
  */

  let selectedCourse = null;

  if (role === "Student") {
    const {
      data: courseData,
      error: courseError,
    } = await supabase
      .from("courses")
      .select(`
        id,
        course_code,
        course_name,
        is_active
      `)
      .eq(
        "id",
        formData.course_id
      )
      .eq("is_active", true)
      .single();

    if (courseError) {
      throw courseError;
    }

    if (!courseData) {
      throw new Error(
        "The selected course could not be found."
      );
    }

    selectedCourse = courseData;
  }

  /*
  =====================================
  CREATE AUTH ACCOUNT
  =====================================
  */

  const {
    data,
    error: signUpError,
  } = await supabase.auth.signUp({
    email,
    password: formData.password,

    options: {
      emailRedirectTo:
        getEmailRedirectUrl(),

      data: {
        full_name: fullName,
        role,

        student_number:
          role === "Student"
            ? studentNumber
            : null,

        employee_id:
          role === "Approver"
            ? employeeId
            : null,

        course:
          role === "Student"
            ? selectedCourse.course_code
            : null,

        year_level:
          role === "Student"
            ? yearLevel
            : null,

        school_year:
          role === "Student"
            ? schoolYear
            : null,

        semester:
          role === "Student"
            ? semester
            : null,

        section:
          role === "Student"
            ? block
            : null,

        student_type:
          role === "Student"
            ? formData.student_type ||
              "Regular"
            : null,

        irregular_subject_ids:
          role === "Student" &&
          formData.student_type ===
            "Irregular"
            ? formData.irregular_subject_ids ||
              []
            : [],
      },
    },
  });

  if (signUpError) {
    throw signUpError;
  }

  if (!data.user) {
    throw new Error(
      "Unable to create account."
    );
  }

  /*
  =====================================
  WAIT FOR EMAIL CONFIRMATION
  =====================================

  Do not insert into public.users here.

  The database trigger in
  enforce_verified_email_registration.sql
  creates the Pending public profile only
  after auth.users.email_confirmed_at is set.
  This prevents unverified or unreachable
  email addresses from appearing as valid
  pending registrations.
  */

  if (data.session) {
    /*
    A session during sign-up means Supabase
    Confirm Email is disabled. Sign out and
    reject the registration immediately.
    */

    await supabase.auth.signOut();

    throw new Error(
      "Registration is temporarily unavailable because email confirmation is disabled in Supabase. Enable Confirm Email before accepting registrations."
    );
  }

  return {
    ...data.user,
    requires_email_confirmation:
      true,
  };
}

/*
=====================================
LOGIN
=====================================
*/

export async function loginUser(
  identifier,
  password
) {
  const normalizedIdentifier =
    identifier.trim();

  let email =
    normalizedIdentifier.toLowerCase();

  const isEmail =
    normalizedIdentifier.includes("@");

  /*
  =====================================
  ID LOGIN
  =====================================
  */

  if (!isEmail) {
    const {
      data,
      error,
    } = await supabase
      .from("users")
      .select("email")
      .or(
        `student_id.eq.${normalizedIdentifier},employee_id.eq.${normalizedIdentifier}`
      )
      .single();

    if (error || !data) {
      throw new Error(
        "Student ID or Employee ID not found."
      );
    }

    email = data.email;
  }

  /*
  =====================================
  SUPABASE AUTH LOGIN
  =====================================
  */

  const {
    data: authData,
    error: authError,
  } = await supabase.auth
    .signInWithPassword({
      email,
      password,
    });

  if (authError) {
    throw authError;
  }

  if (
    !authData.user
      ?.email_confirmed_at
  ) {
    await supabase.auth.signOut();

    throw new Error(
      "Verify your email address before signing in. Open the confirmation link sent to your inbox."
    );
  }

  /*
  =====================================
  LOAD USER PROFILE
  =====================================
  */

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("users")
    .select("*")
    .eq(
      "auth_id",
      authData.user.id
    )
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    await supabase.auth.signOut();

    throw new Error(
      "Your verified registration profile is not ready. Run the verified-email registration SQL in Supabase, then try again."
    );
  }

  if (!profile.email_verified) {
    await supabase.auth.signOut();

    throw new Error(
      "Your email address has not been verified."
    );
  }

  /*
  =====================================
  CHECK ACCOUNT STATUS
  =====================================
  */

  if (profile.status !== "Active") {
    await supabase.auth.signOut();

    if (
      profile.status === "Inactive"
    ) {
      throw new Error(
        "Your account is currently inactive. Please contact the administrator."
      );
    }

    throw new Error(
      "Your account is still awaiting administrator approval."
    );
  }

  return profile;
}

/*
=====================================
CURRENT USER
=====================================
*/

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", user.id)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/*
=====================================
LOGOUT
=====================================
*/

export async function logoutUser() {
  const {
    error,
  } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

/*
=====================================
RESEND EMAIL CONFIRMATION
=====================================
*/

export async function resendEmailConfirmation(
  rawEmail
) {
  const email =
    normalizeAndValidateEmail(
      rawEmail
    );

  const {
    error,
  } = await supabase.auth.resend({
    type: "signup",
    email,

    options: {
      emailRedirectTo:
        getEmailRedirectUrl(),
    },
  });

  if (error) {
    throw error;
  }

  return true;
}

/*
=====================================
RESET PASSWORD
=====================================
*/

export async function resetPassword(
  email
) {
  const normalizedEmail =
    normalizeAndValidateEmail(
      email
    );

  const {
    error,
  } =
    await supabase.auth
      .resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo:
            `${window.location.origin}/reset-password`,
        }
      );

  if (error) {
    throw error;
  }
}