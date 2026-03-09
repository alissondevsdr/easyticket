const prisma = require("../config/prisma");

exports.getCampaigns = async (req, res) => {
    try {
        const campaigns = await prisma.campaign.findMany({
            orderBy: { createdAt: "desc" },
        });
        // Tratar clientIds
        const parsed = campaigns.map((c) => {
            let clientIds = [];
            try {
                clientIds = typeof c.clientIds === 'string' ? JSON.parse(c.clientIds) : (c.clientIds || []);
            } catch (e) {
                console.error(`Erro ao parsear clientIds da campanha ${c.id}:`, e);
            }
            return { ...c, clientIds: Array.isArray(clientIds) ? clientIds : [] };
        });
        res.json(parsed);
    } catch (error) {
        console.error("Erro getCampaigns:", error);
        res.status(500).json({ error: "Erro ao buscar campanhas" });
    }
};

exports.createCampaign = async (req, res) => {
    try {
        const { name, message, image, delayMin, delayMax, limit, randomOrder, status, clientIds } = req.body;

        const clientIdsArray = Array.isArray(clientIds) ? clientIds : [];

        const campaign = await prisma.campaign.create({
            data: {
                name,
                message,
                image,
                delayMin: parseInt(delayMin) || 5,
                delayMax: parseInt(delayMax) || 15,
                limit: parseInt(limit) || 0,
                randomOrder: Boolean(randomOrder),
                status: status || "RASCUNHO",
                clientIds: JSON.stringify(clientIdsArray),
                totalClients: clientIdsArray.length,
                sent: 0
            },
        });

        res.status(201).json(campaign);
    } catch (error) {
        console.error("Erro createCampaign:", error);
        res.status(500).json({ error: "Erro ao criar campanha" });
    }
};

exports.updateCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, message, image, delayMin, delayMax, limit, randomOrder, status, clientIds } = req.body;

        const clientIdsArray = Array.isArray(clientIds) ? clientIds : [];

        const updated = await prisma.campaign.update({
            where: { id: parseInt(id) },
            data: {
                name,
                message,
                image,
                delayMin: parseInt(delayMin) || 5,
                delayMax: parseInt(delayMax) || 15,
                limit: parseInt(limit) || 0,
                randomOrder: Boolean(randomOrder),
                status: status || "RASCUNHO",
                clientIds: JSON.stringify(clientIdsArray),
                totalClients: clientIdsArray.length
            },
        });

        res.json(updated);
    } catch (error) {
        console.error("Erro updateCampaign:", error);
        res.status(500).json({ error: "Erro ao atualizar campanha" });
    }
};

exports.sendCampaign = async (req, res) => {
    try {
        const { id } = req.params;

        const campaign = await prisma.campaign.findUnique({
            where: { id: parseInt(id) }
        });

        if (!campaign) {
            return res.status(404).json({ error: "Campanha não encontrada" });
        }

        if (campaign.status === "ENVIANDO") {
            return res.status(400).json({ error: "A campanha já está sendo enviada." });
        }

        const clientIdsArray = typeof campaign.clientIds === 'string'
            ? JSON.parse(campaign.clientIds)
            : (campaign.clientIds || []);

        if (!clientIdsArray || clientIdsArray.length === 0) {
            return res.status(400).json({ error: "A campanha não possui contatos selecionados." });
        }

        const updatedCampaign = await prisma.campaign.update({
            where: { id: parseInt(id) },
            data: { status: "ENVIANDO", sent: 0 }
        });

        // Opcional: recriar os logs como pendentes para cada tentativa de envio
        await prisma.campaignLog.deleteMany({
            where: { campaignId: parseInt(id) }
        });

        const clients = await prisma.client.findMany({
            where: { id: { in: clientIdsArray.map(Number) } }
        });

        const newLogs = clients.map(c => ({
            campaignId: parseInt(id),
            clientId: c.id,
            clientName: c.client || c.nome || "Desconhecido",
            status: "PENDENTE"
        }));

        if (newLogs.length > 0) {
            await prisma.campaignLog.createMany({ data: newLogs });
        }

        // Tenta engatilhar background worker sem travar o EventLoop da requisição
        const whatsappService = require("../services/whatsapp.service");
        whatsappService.startCampaign(parseInt(id)).catch(err => {
            console.error("Worker erro executando background startCampaign:", err);
        });

        res.json(updatedCampaign);
    } catch (error) {
        console.error("Erro sendCampaign:", error);
        res.status(500).json({ error: "Erro ao iniciar envio da campanha" });
    }
};

exports.getCampaignLogs = async (req, res) => {
    try {
        const { id } = req.params;
        const logs = await prisma.campaignLog.findMany({
            where: { campaignId: parseInt(id) },
            orderBy: { createdAt: "desc" }
        });
        res.json(logs);
    } catch (error) {
        console.error("Erro getLogs:", error);
        res.status(500).json({ error: "Erro ao buscar logs" });
    }
};

exports.deleteCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const campaignId = parseInt(id);

        // Primeiro deleta os logs relacionados
        await prisma.campaignLog.deleteMany({
            where: { campaignId }
        });

        // Depois deleta a campanha
        await prisma.campaign.delete({
            where: { id: campaignId }
        });

        res.json({ message: "Campanha deletada com sucesso" });
    } catch (error) {
        console.error("Erro deleteCampaign:", error);
        res.status(500).json({ error: "Erro ao deletar campanha" });
    }
};
