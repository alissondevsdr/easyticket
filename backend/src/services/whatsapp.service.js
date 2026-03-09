const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const prisma = require('../config/prisma');
const qrcode = require('qrcode');

class WhatsAppService {
    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'easyticket-session'
            }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        this.qrCodeDataUrl = null;
        this.isReady = false;
        this.isInitializing = false;
        this.isAuthenticating = false;
        this.activeCampaigns = new Set();
        this.consecutiveFailures = 0;
        this.MAX_CONSECUTIVE_FAILURES = 5;
        this.userInfo = null; // { name, phone, profilePicUrl }

        this._setupListeners();
    }

    _setupListeners() {
        this.client.on('qr', async (qr) => {
            console.log('QR Code recebido. Gere a leitura.');
            try {
                this.qrCodeDataUrl = await qrcode.toDataURL(qr);
            } catch (err) {
                console.error('Erro ao gerar código QR', err);
            }
        });

        this.client.on('ready', async () => {
            console.log('WhatsApp Web Cliente está PRONTO!');
            this.isReady = true;
            this.isInitializing = false;
            this.isAuthenticating = false;
            this.qrCodeDataUrl = null;
            // Buscar info do usuário conectado
            try {
                const info = this.client.info;
                let profilePicUrl = null;
                try {
                    // Tenta buscar a foto de perfil do próprio usuário
                    profilePicUrl = await this.client.getProfilePicUrl(info.wid._serialized);
                    console.log('Foto obtida via wid:', profilePicUrl ? 'SIM' : 'NÃO');
                } catch (e) {
                    console.log('Falha ao buscar foto via wid, tentando alternativa...');
                }
                // Fallback: tenta com o número formatado
                if (!profilePicUrl) {
                    try {
                        profilePicUrl = await this.client.getProfilePicUrl(`${info.wid.user}@c.us`);
                        console.log('Foto obtida via @c.us:', profilePicUrl ? 'SIM' : 'NÃO');
                    } catch (e2) {
                        console.log('Foto de perfil indisponível (configuração de privacidade)');
                    }
                }
                this.userInfo = {
                    name: info.pushname || info.wid.user,
                    phone: info.wid.user,
                    profilePicUrl
                };
                console.log('Conectado como:', this.userInfo.name, '| Foto:', profilePicUrl ? 'Disponível' : 'Sem foto');
            } catch (err) {
                console.error('Erro ao buscar info do usuário:', err);
            }
        });

        this.client.on('authenticated', () => {
            console.log('Sessão do WhatsApp autenticada com sucesso!');
            this.isAuthenticating = true;
        });

        this.client.on('auth_failure', msg => {
            console.error('Falha na autenticação da sessão do WhatsApp:', msg);
            this.isReady = false;
            this.isAuthenticating = false;
        });

        this.client.on('disconnected', (reason) => {
            console.log('Sessão do WhatsApp desconectada:', reason);
            this.isReady = false;
            this.qrCodeDataUrl = null;
            this.userInfo = null;
            this.isInitializing = false;
            this.client.initialize();
        });
    }

    async logout() {
        try {
            await this.client.logout();
            console.log('WhatsApp deslogado com sucesso.');
        } catch (err) {
            console.error('Erro ao deslogar WhatsApp:', err);
        }
        this.isReady = false;
        this.qrCodeDataUrl = null;
        this.userInfo = null;
        this.isInitializing = false;
        // Reinicializa o cliente para poder gerar um novo QR code depois
        this.client.initialize();
    }

    async initialize() {
        if (!this.isInitializing && !this.isReady) {
            this.isInitializing = true;
            try {
                await this.client.initialize();
            } catch (error) {
                console.error('Erro na inicialização do cliente WhatsApp:', error);
                this.isInitializing = false;
            }
        }
    }

    getQrCode() {
        if (this.isReady) return { status: 'READY', qr: null };
        if (this.qrCodeDataUrl) return { status: 'AWAITING_SCAN', qr: this.qrCodeDataUrl };
        return { status: 'INITIALIZING', qr: null };
    }

    getStatus() {
        if (this.isReady) {
            return {
                status: 'CONNECTED',
                user: this.userInfo,
                qr: null
            };
        }
        if (this.isAuthenticating) {
            return {
                status: 'AUTHENTICATING',
                user: null,
                qr: null
            };
        }
        if (this.qrCodeDataUrl) {
            return {
                status: 'AWAITING_SCAN',
                user: null,
                qr: this.qrCodeDataUrl
            };
        }
        return {
            status: 'INITIALIZING',
            user: null,
            qr: null
        };
    }

    _formatPhone(phone) {
        if (!phone) return null;
        // Limpa tudo que não for número
        let clean = phone.replace(/\D/g, '');
        // Adiciona DDI 55 se não tiver e se for número BR
        if (clean.length === 10 || clean.length === 11) {
            clean = '55' + clean;
        }
        return `${clean}@c.us`;
    }

    _personalizeMessage(message, cliente) {
        const nome = cliente.client || cliente.nome || '';
        const telefone = cliente.phone || cliente.telefone || '';
        const empresa = cliente.empresa || '';

        return message
            .replace(/{nome}/g, nome)
            .replace(/{telefone}/g, telefone)
            .replace(/{empresa}/g, empresa);
    }

    async sendMessage(cliente, messageTemplate, imageBase64) {
        let retries = 0;
        const maxRetries = 2;
        const rawPhone = this._formatPhone(cliente.phone || cliente.telefone);

        if (!rawPhone) {
            throw new Error('Telefone inválido');
        }

        // Resolve o ID real do WhatsApp (corrige o erro "No LID for user")
        let chatId;
        try {
            const numberId = await this.client.getNumberId(rawPhone);
            if (!numberId) {
                throw new Error(`Número ${cliente.phone} não está registrado no WhatsApp`);
            }
            chatId = numberId._serialized;
        } catch (err) {
            throw new Error(`Número ${cliente.phone} não encontrado no WhatsApp: ${err.message}`);
        }

        const formattedMessage = this._personalizeMessage(messageTemplate, cliente);

        while (retries <= maxRetries) {
            try {
                if (imageBase64) {
                    const media = new MessageMedia(
                        imageBase64.split(';')[0].split(':')[1],
                        imageBase64.split(',')[1]
                    );
                    await this.client.sendMessage(chatId, media, { caption: formattedMessage });
                } else {
                    await this.client.sendMessage(chatId, formattedMessage);
                }

                // Sucesso
                this.consecutiveFailures = 0;
                return true;
            } catch (error) {
                console.error(`Falha ao enviar mensagem para ${cliente.phone} (Tentativa ${retries + 1}):`, error.message);
                retries++;
                if (retries > maxRetries) {
                    this.consecutiveFailures++;
                    throw error;
                }
                // Delay curto antes do retry
                await new Promise(res => setTimeout(res, 2000));
            }
        }
    }

    async startCampaign(campaignId) {
        if (!this.isReady) {
            throw new Error('Serviço do WhatsApp não está pronto');
        }

        if (this.activeCampaigns.has(campaignId)) {
            console.log(`Campanha ${campaignId} já está rodando.`);
            return;
        }

        this.activeCampaigns.add(campaignId);
        console.log(`Iniciando campanha ${campaignId}...`);

        try {
            const campaign = await prisma.campaign.findUnique({
                where: { id: campaignId }
            });

            if (!campaign || campaign.status !== 'ENVIANDO') {
                this.activeCampaigns.delete(campaignId);
                return;
            }

            const clientIdsArray = typeof campaign.clientIds === 'string'
                ? JSON.parse(campaign.clientIds)
                : (campaign.clientIds || []);

            let clientIds = clientIdsArray.map(Number);

            if (campaign.randomOrder) {
                clientIds = clientIds.sort(() => Math.random() - 0.5);
            }

            // Para respeitar o limite, validamos quantos já foram enviados
            const pendingLogs = await prisma.campaignLog.findMany({
                where: {
                    campaignId,
                    status: 'PENDENTE',
                    clientId: { in: clientIds }
                }
            });

            if (pendingLogs.length === 0) {
                await this._completeCampaign(campaignId);
                return;
            }

            let logsToProcess = pendingLogs;
            if (campaign.limit > 0) {
                logsToProcess = logsToProcess.slice(0, campaign.limit);
            }

            for (const log of logsToProcess) {
                // Checa se a campanha não foi parada externamente ou excedeu falhas
                if (!this.activeCampaigns.has(campaignId)) break;

                if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
                    console.error('Muitas falhas consecutivas. Pausando campanha e definindo status para ERRO.');
                    await prisma.campaign.update({
                        where: { id: campaignId },
                        data: { status: 'ERRO' }
                    });
                    break;
                }

                const cliente = await prisma.client.findUnique({ where: { id: log.clientId } });

                if (!cliente) {
                    await this._updateLogStatus(log.id, 'FALHOU', 'Cliente não encontrado no BD');
                    continue;
                }

                try {
                    await this.sendMessage(cliente, campaign.message, campaign.image);
                    await this._updateLogStatus(log.id, 'ENVIADO');

                    // Increment in campaign
                    await prisma.campaign.update({
                        where: { id: campaignId },
                        data: { sent: { increment: 1 } }
                    });

                } catch (error) {
                    await this._updateLogStatus(log.id, 'FALHOU', error.message);
                }

                // Delay entre os envios (exceto o último iterador ou se der break)
                if (this.activeCampaigns.has(campaignId)) {
                    const delayMs = this._getRandomDelay(campaign.delayMin, campaign.delayMax);
                    console.log(`Aguardando ${delayMs / 1000}s para o próximo...`);
                    await new Promise(r => setTimeout(r, delayMs));
                }
            }

            // Ao terminar o loop, verifica se faltou algum no BD:
            const stillPending = await prisma.campaignLog.count({
                where: { campaignId, status: 'PENDENTE' }
            });

            if (stillPending === 0 && this.activeCampaigns.has(campaignId)) {
                await this._completeCampaign(campaignId);
            } else if (this.activeCampaigns.has(campaignId)) {
                // Pode ter parado no limite
                await prisma.campaign.update({
                    where: { id: campaignId },
                    data: { status: 'RASCUNHO' } // Volta pra rascunho pra rodar mais depois
                });
            }

        } catch (error) {
            console.error('Erro na execução da campanha:', error);
            await prisma.campaign.update({
                where: { id: campaignId },
                data: { status: 'ERRO' }
            });
        } finally {
            this.activeCampaigns.delete(campaignId);
        }
    }

    stopCampaign(campaignId) {
        if (this.activeCampaigns.has(campaignId)) {
            this.activeCampaigns.delete(campaignId);
            console.log(`Campanha ${campaignId} interrompida.`);
        }
    }

    _getRandomDelay(minSec, maxSec) {
        const minMs = minSec * 1000;
        const maxMs = maxSec * 1000;
        return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    }

    async _updateLogStatus(logId, status, errorMsg = null) {
        await prisma.campaignLog.update({
            where: { id: logId },
            data: {
                status,
                errorMessage: errorMsg ? String(errorMsg).substring(0, 500) : null,
                sentAt: new Date()
            }
        });
    }

    async _completeCampaign(campaignId) {
        await prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'CONCLUIDA' }
        });
        console.log(`Campanha ${campaignId} marcada como CONCLUIDA.`);
    }
}

const whatsappService = new WhatsAppService();
module.exports = whatsappService;
