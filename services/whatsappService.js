// services/whatsappService.js

/**
 * Função global para disparo de mensagens no WhatsApp
 * @param {string} telefone - Número do cliente (ex: 5575999999999)
 * @param {string} mensagem - O texto que será enviado
 */
exports.enviarNotificacao = async (telefone, mensagem) => {
    try {
        // Limpa o telefone para garantir que só tem números
        const numeroLimpo = telefone.replace(/\D/g, '');
        
        if (!numeroLimpo || numeroLimpo.length < 10) {
            console.log("⚠️ Telefone inválido para envio de WhatsApp:", telefone);
            return false;
        }

        // =================================================================
        // AQUI ENTRA A INTEGRAÇÃO COM A API DO WHATSAPP
        // Exemplo genérico usando fetch (Z-API, Evolution API, ChatPro, etc)
        // =================================================================
        
        /* const urlApi = 'https://sua-api-whatsapp.com/message/sendText';
        const apiKey = 'SEU_TOKEN_DE_ACESSO';

        const response = await fetch(urlApi, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                number: `55${numeroLimpo}`,
                text: mensagem
            })
        });

        const result = await response.json();
        console.log("✅ WhatsApp enviado com sucesso!", result);
        */

        // MOCK: Para testarmos antes de você contratar uma API
        console.log(`\n📱 [SIMULAÇÃO WHATSAPP] Disparo para: ${numeroLimpo}`);
        console.log(`Mensagem: "${mensagem}"\n`);
        
        return true;

    } catch (error) {
        console.error("🔥 Erro ao disparar WhatsApp:", error.message);
        return false;
    }
};