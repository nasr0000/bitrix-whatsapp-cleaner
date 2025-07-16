const express = require("express");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;

// Ваш вебхук Bitrix24
const WEBHOOK = "https://itnasr.bitrix24.kz/rest/1/bucjza1li2wbp6lr/";

app.get("/clean", async (req, res) => {
  const dealId = req.query.deal_id;

  if (!dealId) {
    return res.status(400).send("❌ Не передан deal_id");
  }

  try {
    // Получаем сделку по ID
    const dealRes = await axios.post(`${WEBHOOK}crm.deal.get`, { id: dealId });
    const deal = dealRes.data?.result;

    if (!deal) return res.status(404).send("❌ Сделка не найдена");

    let rawPhone = null;

    // 1. Ищем номер в TITLE
    const titleMatch = deal.TITLE?.match(/(?:\+?\d[\d\s\-().]{6,})/);
    if (titleMatch) {
      rawPhone = titleMatch[0];
      console.log("Телефон из TITLE:", rawPhone);
    }

    // 2. Если нет — ищем в контакте
    if (!rawPhone && deal.CONTACT_ID) {
      const contactRes = await axios.post(`${WEBHOOK}crm.contact.get`, {
        id: deal.CONTACT_ID,
      });
      const contact = contactRes.data?.result;

      if (contact?.PHONE?.length) {
        const phoneObj = contact.PHONE.find(p => typeof p.VALUE === "string");
        if (phoneObj) {
          rawPhone = phoneObj.VALUE;
          console.log("Телефон из Контакта:", rawPhone);
        }
      }
    }

    if (!rawPhone) {
      return res.send("❗ Телефон не найден ни в TITLE, ни в Контакте");
    }

    // Очищаем номер от символов
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
  } catch (err) {
    console.error("Ошибка:", err?.response?.data || err.message);
    res.status(500).send("❌ Ошибка при обработке запроса");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
});

app.get("/ping", (req, res) => {
  res.send("pong");
});