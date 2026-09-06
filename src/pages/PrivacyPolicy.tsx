const sectionTitleClass = 'text-[1.05rem] font-extrabold text-[#1E1E1E] mt-8 mb-3';
const paraClass = 'text-[0.9rem] leading-relaxed text-[#545454] mb-3';
const listClass = 'list-disc pl-5 flex flex-col gap-2 text-[0.9rem] leading-relaxed text-[#545454] mb-3';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_20%,rgba(22,17,56,0.05)_0%,rgba(226,30,83,0.05)_90%)] px-6 py-12">
      <div className="mx-auto max-w-[820px] bg-white border border-[#e8e8e8] rounded-2xl px-8 py-10 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)]">
        <div className="mb-6 flex items-center justify-center">
          <div className="inline-flex items-center justify-center h-14 px-4 bg-[rgba(22,17,56,0.04)] border border-[rgba(22,17,56,0.08)] rounded-2xl">
            <img src="/canvas-logo.png" alt="Logo" className="h-[2.4rem] w-auto object-contain" />
          </div>
        </div>

        <h1 className="text-center text-[1.4rem] font-extrabold text-[#1E1E1E] mb-1">Privacy Policy</h1>
        <p className="text-center text-[0.78rem] font-medium text-[#545454] mb-6">Last updated: September 6, 2026</p>

        <p className={paraClass}>
          This Privacy Policy explains how Canvas Dhaka ("we", "us", "our") collects, uses, and protects information
          within the CanProSys production and stock management system ("the System"). The System is an internal
          business tool used by our staff to manage production, inventory, payroll, and related operations -- it is
          not a public consumer product.
        </p>

        <h2 className={sectionTitleClass}>1. Information We Collect</h2>
        <ul className={listClass}>
          <li>
            <strong>Employee records:</strong> name, phone number, role, employment status, wage rates, National ID
            (NID) documents uploaded for verification, and balance/payout/loan history.
          </li>
          <li>
            <strong>Production data:</strong> daily task entries, recipes, material usage, wood processing entries,
            stock levels, and work-in-progress records entered by staff in the course of daily operations.
          </li>
          <li>
            <strong>Account credentials:</strong> usernames and hashed passwords for staff who log into the System.
          </li>
          <li>
            <strong>Google Drive connection (optional, admin-initiated):</strong> if an administrator connects a
            Google account for automated backups, we store an OAuth refresh token and the connected account's email
            address so the System can upload backup files on a schedule.
          </li>
        </ul>

        <h2 className={sectionTitleClass}>2. How We Use Information</h2>
        <ul className={listClass}>
          <li>To operate core business functions: tracking production, inventory, wages, and shipments.</li>
          <li>To verify employee identity for payroll and compliance purposes (NID uploads).</li>
          <li>
            To create automated backups of System data. When Google Drive is connected, we request only the{' '}
            <code>drive.file</code> scope, which lets the System create and manage files it created itself inside a
            dedicated "CanProSys Backups" folder -- it cannot see, read, or modify any other file in the connected
            Google account. The <code>userinfo.email</code> scope is used only to display which account is connected.
          </li>
          <li>To diagnose errors and maintain the reliability and security of the System.</li>
        </ul>

        <h2 className={sectionTitleClass}>3. Data Storage &amp; Retention</h2>
        <p className={paraClass}>
          Data is stored in a private database operated by Canvas Dhaka and is not sold, rented, or shared with third
          parties for advertising or marketing purposes. Backup archives uploaded to Google Drive are retained
          according to the retention period configured by an administrator and are automatically pruned after that
          period. NID documents and employee records are retained for as long as the employment relationship
          continues, plus any period required by applicable labor or tax record-keeping obligations.
        </p>

        <h2 className={sectionTitleClass}>4. Who Can Access Data</h2>
        <p className={paraClass}>
          Access to the System is restricted to authenticated staff, and further restricted by role (Super Admin,
          Manager, Artisan/Staff). Each role can only see the data relevant to its function -- for example, artisans
          can only view their own profile and history. Only Super Admins can connect or disconnect the Google Drive
          backup integration.
        </p>

        <h2 className={sectionTitleClass}>5. Third-Party Services</h2>
        <p className={paraClass}>
          The System integrates with Google Drive (for optional automated backups) and Google's Gemini API (for the
          in-app AI Assistant feature). These providers process data only as necessary to perform the specific
          function requested and are bound by their own privacy and data-handling terms.
        </p>

        <h2 className={sectionTitleClass}>6. Your Rights</h2>
        <p className={paraClass}>
          Employees may request a copy of their own records, a correction of inaccurate information, or removal of
          their NID documents (subject to legal record-keeping requirements) by contacting an administrator directly.
          An administrator can disconnect the Google Drive integration at any time from the System Settings page,
          which revokes the System's access to that Google account.
        </p>

        <h2 className={sectionTitleClass}>7. Contact</h2>
        <p className={paraClass}>
          Questions about this Privacy Policy can be sent to{' '}
          <a href="mailto:dhakastationary94@gmail.com" className="font-semibold text-[#e21e53]">
            dhakastationary94@gmail.com
          </a>
          .
        </p>

        <p className="text-center mt-10 text-[0.68rem] text-[#545454] opacity-70">© 2026 Canvas Dhaka / CanProSys.</p>
      </div>
    </div>
  );
}
