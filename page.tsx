import React from 'react';
import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-black text-zinc-300 p-4 md:p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-sky-500 hover:text-sky-400">&larr; Voltar para a Home</Link>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 mb-4">Termos de Serviço</h1>
        <div className="prose prose-invert prose-zinc max-w-none">
          <p>Última atualização: [Data]</p>
          
          <h2 className="text-xl font-semibold text-zinc-200 mt-6">1. Aceitação dos Termos</h2>
          <p>
            Ao usar o aplicativo Nucleo PTU ("Serviço"), você concorda em cumprir estes Termos de Serviço. Se você não concordar com estes termos, não use o Serviço.
          </p>

          <h2 className="text-xl font-semibold text-zinc-200 mt-6">2. Uso do Serviço</h2>
          <p>
            Você concorda em usar o Serviço apenas para os fins a que se destina. Você não deve usar o Serviço para qualquer atividade ilegal ou não autorizada.
          </p>
          
          <h2 className="text-xl font-semibold text-zinc-200 mt-6">3. Integração com Google Calendar</h2>
          <p>
            A integração com o Google Calendar é um recurso opcional. Ao conectar sua conta, você nos concede permissão para acessar e gerenciar seus eventos de calendário conforme descrito em nossa Política de Privacidade. A responsabilidade pela precisão e conteúdo dos eventos criados através do nosso Serviço é sua.
          </p>

          <h2 className="text-xl font-semibold text-zinc-200 mt-6">4. Limitação de Responsabilidade</h2>
          <p>
            O Serviço é fornecido "como está". Não garantimos que o serviço será ininterrupto ou livre de erros. Em nenhuma circunstância seremos responsáveis por quaisquer danos diretos ou indiretos resultantes do uso do Serviço.
          </p>

          <h2 className="text-xl font-semibold text-zinc-200 mt-6">5. Alterações nos Termos</h2>
          <p>
            Reservamo-nos o direito de modificar estes termos a qualquer momento. Notificaremos sobre quaisquer alterações publicando os novos Termos de Serviço nesta página.
          </p>

          <h2 className="text-xl font-semibold text-zinc-200 mt-6">6. Contato</h2>
          <p>
            Se você tiver alguma dúvida sobre estes Termos, entre em contato conosco pelo e-mail: <a href="mailto:gabriel.grechi@solus.inf.br" className="text-sky-400">gabriel.grechi@solus.inf.br</a>.
          </p>
        </div>
      </div>
    </div>
  );
}