import { ChevronDown } from 'lucide-react'

const questions = [
  {
    question: 'What is CRITERIA?',
    answer: 'CRITERIA is a property marketplace where sellers publish listings and buyers publish what they are looking for. Both sides can discover relevant posts and start a conversation.',
  },
  {
    question: 'Do I need an account to explore posts?',
    answer: 'Yes. Create an account or sign in to browse property listings. Buyer requests are available to accounts with a seller role, as well as the person who posted the request.',
  },
  {
    question: 'Who can publish a property or a buyer request?',
    answer: 'A seller account can publish properties. A buyer account can publish buyer requests. Choose both roles if you want to do both.',
  },
  {
    question: 'Can I change how I use CRITERIA later?',
    answer: 'Yes. You can change your buyer, seller, or both role in your profile. Your own existing posts remain visible there even if your role changes.',
  },
  {
    question: 'How do buyers and sellers contact one another?',
    answer: 'Open an eligible property listing or buyer request and use its message action. Conversations continue in Inbox.',
  },
] as const

export function LandingFAQ() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-8 bg-background px-6 py-14 md:px-10 md:py-20">
      <div className="mx-auto w-full max-w-[980px]">
        <div className="max-w-2xl">
          <p className="editorial-kicker">The essentials</p>
          <h2 id="faq-heading" className="editorial-title mt-3">Questions before you start?</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">A short guide to how this two-sided marketplace works.</p>
        </div>
        <div className="mt-9 divide-y divide-border border-y border-border">
          {questions.map(({ question, answer }) => (
            <details key={question} className="group py-1">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 text-left text-base font-semibold text-foreground marker:hidden [&::-webkit-details-marker]:hidden">
                <span>{question}</span>
                <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-primary-600 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <p className="max-w-3xl pb-5 pr-8 text-sm leading-relaxed text-muted-foreground md:text-base">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
