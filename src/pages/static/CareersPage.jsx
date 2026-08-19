import StaticPage from '../StaticPage'

export default function CareersPage() {
  return (
    <StaticPage title="Careers" subtitle="Join the NaijaMart team">
      <h2 className="text-base font-black text-secondary mb-3">Why Work at NaijaMart?</h2>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        We're building the future of commerce in Nigeria. Join a fast-growing team that's making online shopping accessible to millions of Nigerians. We value ownership, creativity, and impact.
      </p>

      <h2 className="text-base font-black text-secondary mb-3">Open Positions</h2>
      <div className="space-y-3 mb-6">
        {[
          { title: 'Full-Stack Engineer', dept: 'Engineering', location: 'Lagos / Remote' },
          { title: 'Product Designer', dept: 'Design', location: 'Lagos' },
          { title: 'Operations Lead', dept: 'Operations', location: 'Lagos' },
          { title: 'Growth Marketing Manager', dept: 'Marketing', location: 'Lagos / Remote' },
        ].map((job) => (
          <div key={job.title} className="bg-background rounded-lg p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-secondary">{job.title}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{job.dept} · {job.location}</p>
            </div>
            <a href="mailto:careers@naijamart.com" className="text-xs font-bold text-primary hover:underline shrink-0">Apply →</a>
          </div>
        ))}
      </div>

      <h2 className="text-base font-black text-secondary mb-3">Benefits</h2>
      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
        <li>Competitive salary and equity options</li>
        <li>Flexible remote work policy</li>
        <li>Health insurance for you and your family</li>
        <li>Learning & development budget</li>
        <li>Annual team retreats</li>
      </ul>

      <div className="bg-background rounded-lg p-4 mt-6">
        <p className="text-sm text-gray-600">
          Don't see a role that fits? Send your CV to{' '}
          <a href="mailto:careers@naijamart.com" className="text-primary font-bold hover:underline">careers@naijamart.com</a>{' '}
          and we'll keep you in mind for future openings.
        </p>
      </div>
    </StaticPage>
  )
}
