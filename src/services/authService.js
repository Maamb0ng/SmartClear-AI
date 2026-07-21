import { supabase } from "./supabase";

/*
=====================================
REGISTER
=====================================
*/

export async function registerUser(formData) {
  const fullName =
    formData.full_name?.trim();

  const email =
    formData.email
      ?.trim()
      .toLowerCase();

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

  if (!email) {
    throw new Error(
      "Email address is required."
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
  SAVE PUBLIC USER PROFILE
  =====================================
  */

  const {
    error: profileError,
  } = await supabase
    .from("users")
    .insert({
      auth_id: data.user.id,

      student_id:
        role === "Student"
          ? studentNumber
          : null,

      employee_id:
        role === "Approver"
          ? employeeId
          : null,

      full_name: fullName,
      email,
      role,

      department: null,

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

      /*
      The real section UUID will be
      assigned by the administrator.
      */

      section_id: null,

      office: null,
      profile_picture: null,

      status: "Pending",
      email_verified: false,
    });

  if (profileError) {
    await supabase.auth.signOut();
    throw profileError;
  }

  return data.user;
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
    .single();

  if (profileError) {
    throw profileError;
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
RESET PASSWORD
=====================================
*/

export async function resetPassword(
  email
) {
  const normalizedEmail =
    email.trim().toLowerCase();

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