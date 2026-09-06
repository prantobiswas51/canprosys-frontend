const sectionTitleClass = 'text-[1.05rem] font-extrabold text-[#1E1E1E] mt-8 mb-3';
const paraClass = 'text-[0.9rem] leading-relaxed text-[#545454] mb-3';
const listClass = 'list-disc pl-5 flex flex-col gap-2 text-[0.9rem] leading-relaxed text-[#545454] mb-3';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_20%,rgba(22,17,56,0.05)_0%,rgba(226,30,83,0.05)_90%)] px-6 py-12">
      <div className="mx-auto max-w-[820px] bg-white border border-[#e8e8e8] rounded-2xl px-8 py-10 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)]">
        <div className="mb-6 flex items-center justify-center">
          <div className="inline-flex items-center justify-center h-14 px-4 bg-[rgba(22,17,56,0.04)] border border-[rgba(22,17,56,0.08)] rounded-2xl">
            <img src="/canvas-logo.png" alt="Logo" className="h-[2.4rem] w-auto object-contain" />
          </div>
        </div>

        <h1 className="text-center text-[1.4rem] font-extrabold text-[#1E1E1E] mb-1">Terms &amp; Conditions</h1>
        <p className="text-center text-[0.78rem] font-medium text-[#545454] mb-6">Last updated: September 6, 2026</p>

        <p className={paraClass}>
          These Terms &amp; Conditions govern the use of the CanProSys production and stock management system ("the
          System") operated by Canvas Dhaka. The System is an internal tool for authorized staff and administrators
          only. By logging in or using the System, you agree to these terms.
        </p>

        <h2 className={sectionTitleClass}>1. Authorized Use Only</h2>
        <p className={paraClass}>
          Access is limited to employees and administrators explicitly granted an account by a Canvas Dhaka Super
          Admin or Manager. Accounts are personal and must not be shared. Each user is responsible for keeping their
          login credentials confidential and for all activity recorded under their account.
        </p>

        <h2 className={sectionTitleClass}>2. Acceptable Use</h2>
        <ul className={listClass}>
          <li>Use the System only for legitimate business purposes related to Canvas Dhaka's operations.</li>
          <li>Do not enter false production, inventory, or payroll data.</li>
          <li>Do not attempt to access data, roles, or features beyond what your assigned role permits.</li>
          <li>Do not attempt to disrupt, reverse-engineer, or gain unauthorized access to the System or its data.</li>
        </ul>

        <h2 className={sectionTitleClass}>3. Data Accuracy</h2>
        <p className={paraClass}>
          Users are responsible for the accuracy of the information they enter (daily entries, stock counts, wage
          records, etc.). Canvas Dhaka relies on this data for payroll, inventory, and financial decisions, so
          entries should reflect actual work and stock as closely as possible. Corrections should be made promptly
          through the System's edit tools rather than worked around informally.
        </p>

        <h2 className={sectionTitleClass}>4. Google Drive Integration</h2>
        <p className={paraClass}>
          Administrators may optionally connect a Google account to enable automated backups. This feature only
          creates and manages backup files that the System itself uploads to a dedicated folder in that Google
          account -- it does not access, read, or modify any other files. The connection can be revoked at any time
          from System Settings.
        </p>

        <h2 className={sectionTitleClass}>5. Availability &amp; No Warranty</h2>
        <p className={paraClass}>
          The System is provided on an "as is" and "as available" basis for internal use. While we take reasonable
          steps to keep it reliable and to back up data, Canvas Dhaka does not guarantee uninterrupted availability
          and is not liable for losses arising from downtime, bugs, or data entry errors made by users.
        </p>

        <h2 className={sectionTitleClass}>6. Changes to the System or These Terms</h2>
        <p className={paraClass}>
          Canvas Dhaka may modify, extend, or discontinue features of the System, and may update these Terms &amp;
          Conditions from time to time. Continued use of the System after changes are published constitutes
          acceptance of the updated terms.
        </p>

        <h2 className={sectionTitleClass}>7. Account Termination</h2>
        <p className={paraClass}>
          Access may be suspended or revoked at any time, including upon end of employment or a violation of these
          terms, at the discretion of a Super Admin.
        </p>

        <h2 className={sectionTitleClass}>8. Contact</h2>
        <p className={paraClass}>
          Questions about these Terms can be sent to{' '}
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
