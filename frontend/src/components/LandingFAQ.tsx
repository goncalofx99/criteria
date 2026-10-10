import { ChevronDown } from 'lucide-react'
import { useLanguage } from '@/lib/language'

const questions = [
  {
    questionPt: 'O que é a CRITERIA?',
    question: 'What is CRITERIA?',
    answerPt: 'A CRITERIA é uma plataforma imobiliária onde os vendedores publicam imóveis e os compradores publicam o que procuram. Ambos podem descobrir publicações relevantes e iniciar uma conversa.',
    answer: 'CRITERIA is a property marketplace where sellers publish listings and buyers publish what they are looking for. Both sides can discover relevant posts and start a conversation.',
  },
  {
    questionPt: 'Preciso de uma conta para explorar imóveis?',
    question: 'Do I need an account to browse properties?',
    answerPt: 'Não. Qualquer pessoa pode pesquisar e ver anúncios de imóveis. Crie uma conta para contactar um vendedor ou publicar. Os critérios são visíveis aos vendedores elegíveis e à pessoa que os publicou.',
    answer: 'No. Anyone can search and view property listings. Create an account to contact a seller or publish a post. Criteria are available to eligible sellers and the person who posted them.',
  },
  {
    questionPt: 'Quem pode publicar imóveis ou critérios?',
    question: 'Who can publish a property or criteria?',
    answerPt: 'Uma conta de vendedor pode publicar imóveis. Uma conta de comprador pode publicar critérios. Escolha ambos os perfis se quiser fazer as duas coisas.',
    answer: 'A seller account can publish properties. A buyer account can publish criteria. Choose both roles if you want to do both.',
  },
  {
    questionPt: 'Posso alterar a forma como uso a CRITERIA?',
    question: 'Can I change how I use CRITERIA later?',
    answerPt: 'Sim. Pode alterar o seu perfil de comprador, vendedor ou ambos na página de perfil. As suas publicações continuam visíveis nessa página, mesmo que mude de perfil.',
    answer: 'Yes. You can change your buyer, seller, or both role in your profile. Your own existing posts remain visible there even if your role changes.',
  },
  {
    questionPt: 'Como entram compradores e vendedores em contacto?',
    question: 'How do buyers and sellers contact one another?',
    answerPt: 'Abra um anúncio de imóvel ou critério a que tenha acesso e use a opção de enviar mensagem. As conversas continuam em Mensagens.',
    answer: 'Open an eligible property listing or criteria post and use its message action. Conversations continue in Inbox.',
  },
] as const

export function LandingFAQ() {
  const { t } = useLanguage()
  return (
    <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-8 bg-background px-6 py-14 md:px-10 md:py-20">
      <div className="mx-auto w-full max-w-[980px]">
        <h2 id="faq-heading" className="text-[clamp(1.65rem,3vw,2.25rem)] font-semibold leading-tight tracking-[-.025em]">{t('Como funciona a CRITERIA', 'How CRITERIA works')}</h2>
        <div className="mt-6 divide-y divide-border border-y border-border">
          {questions.map(({ question, questionPt, answer, answerPt }) => (
            <details key={question} className="group py-1">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 text-left text-base font-semibold text-foreground marker:hidden [&::-webkit-details-marker]:hidden">
                <span>{t(questionPt, question)}</span>
                <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-primary-600 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <p className="max-w-3xl pb-5 pr-8 text-sm leading-relaxed text-muted-foreground md:text-base">{t(answerPt, answer)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
