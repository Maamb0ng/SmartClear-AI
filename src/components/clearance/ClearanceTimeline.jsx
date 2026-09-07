import DashboardLayout from "../../layouts/DashboardLayout";
import ClearanceTimeline from "../../components/clearance/ClearanceTimeline";

function RequestClearance() {
  const offices = [
    {
      office: "Registrar",
      status: "Approved",
      remarks: "No pending records.",
    },
    {
      office: "Library",
      status: "Pending",
      remarks: "Waiting for librarian approval.",
    },
    {
      office: "Cashier",
      status: "Rejected",
      remarks: "Outstanding balance detected.",
    },
    {
      office: "Guidance Office",
      status: "Approved",
      remarks: "Cleared.",
    },
    {
      office: "Clinic",
      status: "Approved",
      remarks: "Medical requirements complete.",
    },
    {
      office: "OSA",
      status: "Pending",
      remarks: "Awaiting review.",
    },
    {
      office: "Department Chair",
      status: "Pending",
      remarks: "Waiting for approval.",
    },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-800">
          Request Clearance
        </h1>

        <p className="mt-2 text-slate-500">
          Monitor your clearance progress and submit your clearance request.
        </p>
      </div>

      {/* Student Information */}
      <div className="mb-8 rounded-3xl bg-white p-6 shadow-lg">
        <h2 className="mb-6 text-2xl font-bold text-slate-800">
          Student Information
        </h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-slate-500">Student Number</p>
            <h3 className="mt-1 font-semibold">2023-00001</h3>
          </div>

          <div>
            <p className="text-sm text-slate-500">Student Name</p>
            <h3 className="mt-1 font-semibold">Juan Dela Cruz</h3>
          </div>

          <div>
            <p className="text-sm text-slate-500">Program</p>
            <h3 className="mt-1 font-semibold">
              BS Information Technology
            </h3>
          </div>

          <div>
            <p className="text-sm text-slate-500">Year Level</p>
            <h3 className="mt-1 font-semibold">4th Year</h3>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-3xl bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            Overall Progress
          </h2>

          <span className="text-xl font-bold text-blue-700">
            57%
          </span>
        </div>

        <div className="mt-5 h-4 rounded-full bg-slate-200">
          <div className="h-4 w-[57%] rounded-full bg-blue-600"></div>
        </div>

        <div className="mt-4 flex flex-col gap-2 text-slate-500 md:flex-row md:justify-between">
          <p>4 of 7 offices have completed your clearance.</p>

          <p className="font-medium">
            Last Updated: July 10, 2026 • 1:15 PM
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="mt-8">
        <ClearanceTimeline />
      </div>

      {/* Clearance Offices */}
      <div className="mt-8 rounded-3xl bg-white p-6 shadow-lg">
        <h2 className="mb-6 text-2xl font-bold">
          Clearance Offices
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left">Office</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Remarks</th>
              </tr>
            </thead>

            <tbody>
              {offices.map((office) => (
                <tr
                  key={office.office}
                  className="border-b"
                >
                  <td className="px-4 py-4 font-medium">
                    {office.office}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        office.status === "Approved"
                          ? "bg-green-100 text-green-700"
                          : office.status === "Pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {office.status}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    {office.remarks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-8 flex flex-wrap justify-end gap-4">
        <button className="rounded-xl border border-blue-700 px-6 py-3 font-semibold text-blue-700 transition hover:bg-blue-50">
          Download PDF
        </button>

        <button className="rounded-xl bg-blue-700 px-8 py-3 font-semibold text-white transition hover:bg-blue-800">
          Submit Clearance Request
        </button>
      </div>
    </DashboardLayout>
  );
}

export default RequestClearance;