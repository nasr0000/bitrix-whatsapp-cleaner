const express = require("express");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;

// Вебхук из Bitrix24
const WEBHOOK = "https://itnasr.bitrix24.kz/rest/1/bucjza1li2wbp6lr/";


app.get("/clean", async (req, res) => {
  const dealId = req.query.deal_id;

  if (!dealId) {
    return res.status(400).send("❌ Нет deal_id");
  }

  try {
    // Получаем сделку по ID
    const dealResponse = await axios.post(`${WEBHOOK}crm.deal.get`, {
      id: dealId,
    });

    const deal = dealResponse.data.result;

    if (!deal || !deal.TITLE) {
      return res.status(404).send("❌ Сделка не найдена или нет TITLE");
    }

    // Ищем номер телефона в TITLE
    const match = deal.TITLE.match(/(?:\+?\d[\d\s\-().]{6,})/);
    if (!match) {
      return res.send("❗ Телефон не найден в TITLE");
    }

    const rawPhone = match[0];
const cleanedPhone = rawPhone.replace(/\D/g, ""); // только цифры
const whatsappLink = `https://wa.me/${cleanedPhone}`;

// Обновляем сделку
await axios.post(`${WEBHOOK}crm.deal.update`, {
  id: dealId,
  fields: {
    UF_CRM_1729359889: whatsappLink
  },
});

    res.send(`✅ Телефон очищен: ${cleanedPhone}<br>✅ WhatsApp: <a href="${whatsappLink}" target="_blank">${whatsappLink}</a>`);
  } catch (error) {
    console.error("Ошибка:", error?.response?.data || error.message);
    res.status(500).send("❌ Произошла ошибка");
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});


