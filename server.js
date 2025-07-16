const express = require("express");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;

const WEBHOOK = "https://itnasr.bitrix24.kz/rest/1/bucjza1li2wbp6lr/";

// Очистка WhatsApp в сделке
app.get("/clean", async (req, res) => {
  const dealId = req.query.deal_id;
  if (!dealId) return res.status(400).send("❌ Не передан deal_id");

  try {
    const dealRes = await axios.post(`${WEBHOOK}crm.deal.get`, { id: dealId });
    const deal = dealRes.data?.result;
    if (!deal) return res.status(404).send("❌ Сделка не найдена");

    let rawPhone = null;

    // 1. Ищем номер в TITLE
    const titleMatch = deal.TITLE?.match(/(?:\+?\d[\d\s\-().]{6,})/);
    if (titleMatch) {
      rawPhone = titleMatch[0];
      console.log("📌 Телефон из TITLE:", rawPhone);
    }

    // 2. Если нет — получаем из контакта
    if (!rawPhone && deal.CONTACT_ID) {
      const contactRes = await axios.post(`${WEBHOOK}crm.contact.get`, {
        id: deal.CONTACT_ID,
      });
      const contact = contactRes.data?.result;
      const phoneObj = contact?.PHONE?.find(p => typeof p.VALUE === "string");
      if (phoneObj) {
        rawPhone = phoneObj.VALUE;
        console.log("📌 Телефон из контакта:", rawPhone);
      }
    }

    if (!rawPhone) {
      return res.send("❗ Телефон не найден ни в TITLE, ни в Контакте");
    }

    const cleanedPhone = rawPhone.replace(/\D/g, "");
    const whatsappLink = `https://wa.me/${cleanedPhone}`;

    await axios.post(`${WEBHOOK}crm.deal.update`, {
      id: dealId,
      fields: {
        UF_CRM_1729359889: whatsappLink,
      },
    });

    res.send(`✅ Сделка обновлена: <a href="${whatsappLink}" target="_blank">${whatsappLink}</a>`);
  } catch (err) {
    console.error("❌ Ошибка:", err?.response?.data || err.message);
    res.status(500).send("❌ Ошибка при обработке сделки");
  }
});

// Ping
app.get("/ping", (req, res) => {
  res.send("pong");
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
