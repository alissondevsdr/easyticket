const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp.service');

// Rota opcional mas útil para o painel futuro monitorar/pegar o QR:
router.get('/qrcode', (req, res) => {
    try {
        const statusData = whatsappService.getQrCode();
        res.json(statusData);
    } catch (err) {
        res.status(500).json({ error: 'Erro gerando QR Code' });
    }
});

router.get('/status', (req, res) => {
    try {
        const statusData = whatsappService.getStatus();
        res.json(statusData);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar status do WhatsApp' });
    }
});

router.post('/initialize', async (req, res) => {
    try {
        await whatsappService.initialize();
        res.json({ message: 'Processo de inicialização do WhatsApp solicitado com sucesso.' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao solicitar inicialização do WhatsApp' });
    }
});

router.post('/logout', async (req, res) => {
    try {
        await whatsappService.logout();
        res.json({ message: 'WhatsApp desconectado com sucesso.' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao desconectar WhatsApp' });
    }
});

module.exports = router;
