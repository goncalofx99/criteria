import { useId } from 'react'
import { Capacitor } from '@capacitor/core'
import { reviewMode } from '@/review/mode'
import { getAnalyticsConsent, webAnalyticsAvailable } from '@/lib/analytics'
import { useLanguage } from '@/lib/language'

export function PrivacyInformation() {
  const { t } = useLanguage()
  const id = useId()
  const native = Capacitor.isNativePlatform()
  const analyticsAvailable = typeof window !== 'undefined' && webAnalyticsAvailable(window.location.hostname, import.meta.env.PROD, native, reviewMode)
  const analyticsAllowed = analyticsAvailable && getAnalyticsConsent() === 'granted'
  return (
    <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
      <section aria-labelledby={`${id}-storage-heading`}>
        <h2 id={`${id}-storage-heading`} className="mb-2 text-base font-semibold text-foreground">{t('Guardado no seu dispositivo', 'Stored on your device')}</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-foreground">{t('Sessão:', 'Sign-in:')}</strong> {t('os tokens de acesso e atualização ficam guardados no armazenamento local para manter a sessão iniciada. Terminar sessão remove-os', 'access and refresh tokens are kept in local storage so you can stay signed in. Signing out removes them from')} {native ? t('desta aplicação.', 'this app.') : t('deste navegador.', 'this browser.')}</li>
          <li><strong className="text-foreground">{t('Aspeto:', 'Appearance:')}</strong> {t('a escolha entre tema claro, escuro ou do sistema fica guardada no armazenamento local até a alterar ou limpar os dados do site.', 'your light, dark, or system choice is kept in local storage until you change it or clear site data.')}</li>
          <li><strong className="text-foreground">{t('Idioma:', 'Language:')}</strong> {t('a escolha entre português e inglês fica guardada no armazenamento local até a alterar ou limpar os dados do site.', 'your Portuguese or English choice is kept in local storage until you change it or clear site data.')}</li>
          <li><strong className="text-foreground">{t('Navegação:', 'Navigation:')}</strong> {t('o armazenamento de sessão lembra a página a que regressar após iniciar sessão e a posição de deslocação nos resultados durante esta sessão.', 'session storage remembers where to return after sign-in and your Explore scroll position for this session.')}</li>
          {!native && <li><strong className="text-foreground">{t('Este aviso:', 'This notice:')}</strong> {t('o armazenamento local regista que já o viu, para não aparecer em cada visita.', 'local storage remembers that you have seen it, so it does not appear on every visit.')}</li>}
        </ul>
      </section>

      <section aria-labelledby={`${id}-external-heading`}>
        <h2 id={`${id}-external-heading`} className="mb-2 text-base font-semibold text-foreground">{t('Serviços externos em funcionalidades específicas', 'External services in specific features')}</h2>
        <p>
          {t('Ao abrir um mapa, os mosaicos são carregados do fornecedor configurado (OpenStreetMap por predefinição). Ao procurar uma morada, o texto é enviado ao OpenStreetMap Nominatim. Estes serviços recebem dados normais do pedido, como o seu endereço IP. Consulte a', 'When a map appears, its tiles load from the configured map provider (OpenStreetMap by default). Pressing Find or Enter for an address sends that search text to OpenStreetMap Nominatim. These services receive normal request information, such as your IP address. See the')}{' '}
          <a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2">{t('política de privacidade do OpenStreetMap', 'OpenStreetMap privacy policy')}</a>.
        </p>
        <p className="mt-2">{t('Se escolher iniciar sessão com Google, passará pelo serviço de autenticação da Google. Uma fotografia de perfil da Google ou de um anúncio antigo alojada fora da CRITERIA pode ser pedida ao respetivo alojamento quando apresentada. A CRITERIA disponibiliza as fontes da interface a partir do próprio serviço.', 'Choosing Google sign-in takes you through Google’s sign-in service. A Google profile photo or an older listing photo hosted outside CRITERIA may also be requested from its image host when shown. CRITERIA serves its interface fonts itself.')}</p>
      </section>

      <section aria-labelledby={`${id}-control-heading`}>
        <h2 id={`${id}-control-heading`} className="mb-2 text-base font-semibold text-foreground">{t('As suas opções', 'Your controls')}</h2>
        {analyticsAvailable ? <p>{t('Neste navegador,', 'You have')} {analyticsAllowed ? t('permitiu', 'allowed') : t('não permitiu', 'not allowed')} {t('a análise estatística opcional da Cloudflare. Quando permitida, mede visualizações de páginas e desempenho de carregamento.', 'optional Cloudflare Web Analytics in this browser. When allowed, its beacon measures page views and load performance.')} <a href="https://developers.cloudflare.com/web-analytics/about/" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2">{t('A Cloudflare descreve o Web Analytics', 'Cloudflare describes its Web Analytics')}</a> {t('como livre de cookies e afirma que não usa dados pessoais dos visitantes nem regista parâmetros de pesquisa dos URL. Pode alterar ou retirar a sua escolha nas Definições; a retirada atualiza a página para parar a análise.', 'as cookie-free and says it does not use visitors’ personal data or log query strings. You can change or withdraw your choice from Settings; withdrawal reloads the page to stop the beacon.')}</p> : <p>{t('A análise estatística opcional não está configurada neste site ou aplicação. O código da CRITERIA não carrega scripts de publicidade.', 'Optional analytics is not configured for this site or app. CRITERIA’s application code does not load advertising scripts.')}</p>}
        <p className="mt-2">{t('Pode alterar o tema nas Definições e terminar sessão para remover os tokens de sessão.', 'You can change your theme in Settings and sign out to remove session tokens.')} {native ? t('As opções de dados da aplicação no dispositivo podem remover as preferências guardadas.', 'Your device’s app-data controls can remove saved preferences.') : t('Limpar os dados deste site no navegador remove as preferências guardadas.', 'Clearing this site’s data in your browser removes saved preferences.')}</p>
        <p className="mt-2">{t('Se tiver dúvidas sobre os seus dados ou quiser pedir acesso, retificação ou eliminação, contacte', 'For questions about your data, or to request access, correction, or deletion, contact')} <a href="mailto:criteriaappportugal@gmail.com" className="font-semibold text-primary underline underline-offset-2">criteriaappportugal@gmail.com</a>.</p>
      </section>
    </div>
  )
}
