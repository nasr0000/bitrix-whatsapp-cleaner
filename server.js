const express = require("express");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;

const WEBHOOK = "https://itnasr.bitrix24.kz/rest/1/bucjza1li2wbp6lr/";

app.get("/clean", async (req, res) => {
  const dealId = req.query.deal_id;

  if (!dealId) {
    return res.status(400).send("❌ Нет deal_id");
  }

  try {
    // Получаем сделку
    const dealResponse = await axios.post(`${WEBHOOK}crm.deal.get`, {
      id: dealId,
    });
    const deal = dealResponse.data.result;

    if (!deal) {
      return res.status(404).send("❌ Сделка не найдена");
    }

    let rawPhone = null;

    // 1. Пытаемся найти номер в TITLE
    if (deal.TITLE) {
      const match = deal.TITLE.match(/(?:\+?\d[\d\s\-().]{6,})/);
      if (match) {
        rawPhone = match[0];
      }
    }

    // 2. Если не нашли — получаем контакт по ID
    if (!rawPhone && deal.CONTACT_ID) {
      const contactResponse = await axios.post(`${WEBHOOK}crm.contact.get`, {
        id: deal.CONTACT_ID,
      });
      const contact = contactResponse.data.result;

      if (contact && contact.HAS_PHONE === 'Y' && contact.PHONE?.[0]?.VALUE) {
        rawPhone = contact.PHONE[0].VALUE;
      }
    }

    if (!rawPhone) {
      return res.send("❗ Телефон не найден ни в TITLE, ни в Контакте");
    }

    const cleanedPhone = rawPhone.replace(/\D/g, "");
    const whatsappLink = `https://wa.me/${cleanedPhone}`;

    // Обновляем сделку
    await axios.post(`${WEBHOOK}crm.deal.update`, {
      id: dealId,
      fields: {
        UF_CRM_1729359889: whatsappLink,
      },
    });

    res.send(`✅ WhatsApp: <a href="${whatsappLink}" target="_blank">${whatsappLink}</a>`);
  } catch (error) {
    console.error("Ошибка:", error?.response?.data || error.message);
    res.status(500).send("❌ Произошла ошибка");
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
