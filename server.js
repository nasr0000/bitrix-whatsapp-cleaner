const express = require("express");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;

// Ваш вебхук Bitrix24
const WEBHOOK = "https://itnasr.bitrix24.kz/rest/1/bucjza1li2wbp6lr/";

// ========= 1. Очистка WhatsApp в сделке =========
app.get("/clean", async (req, res) => {
  const dealId = req.query.deal_id;

  if (!dealId) return res.status(400).send("❌ Не передан deal_id");

  try {
    const dealRes = await axios.post(`${WEBHOOK}crm.deal.get`, { id: dealId });
    const deal = dealRes.data?.result;
    if (!deal) return res.status(404).send("❌ Сделка не найдена");

    let rawPhone = null;

    // 1. TITLE
    const titleMatch = deal.TITLE?.match(/(?:\+?\d[\d\s\-().]{6,})/);
    if (titleMatch) {
      rawPhone = titleMatch[0];
      console.log("Телефон из TITLE:", rawPhone);
    }

    // 2. Контакт
    if (!rawPhone && deal.CONTACT_ID) {
      const contactRes = await axios.post(`${WEBHOOK}crm.contact.get`, { id: deal.CONTACT_ID });
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

    // Очистка
    const cleanedPhone = rawPhone.replace(/\D/g, "");
    const whatsappLink = `https://wa.me/${cleanedPhone}`;

    // Обновление сделки
    await axios.post(`${WEBHOOK}crm.deal.update`, {
      id: dealId,
      fields: { UF_CRM_1729359889: whatsappLink },
    });

    res.send(`✅ Сделка обновлена: <a href="${whatsappLink}" target="_blank">${whatsappLink}</a>`);
  } catch (err) {
    console.error("❌ Ошибка:", err?.response?.data || err.message);
    res.status(500).send("❌ Ошибка при обработке запроса");
  }
});

// ========= 2. Очистка WhatsApp в счёте =========
app.get("/clean-invoice", async (req, res) => {
  const invoiceId = req.query.id;

  if (!invoiceId) return res.status(400).send("❌ Не передан id счёта");

  try {
    const invoiceRes = await axios.post(`${WEBHOOK}crm.invoice.item.get`, { id: invoiceId });
    const invoice = invoiceRes.data?.result?.fields;

    if (!invoice) return res.status(404).send("❌ Счёт не найден");

    const rawPhone = invoice.UF_CRM_SMART_INVOICE_1729361040;

    if (!rawPhone) return res.send("❗ Поле WhatsApp пустое");

    const cleanedPhone = rawPhone.replace(/\D/g, "");
    const whatsappLink = `https://wa.me/${cleanedPhone}`;

    await axios.post(`${WEBHOOK}crm.invoice.item.update`, {
      id: invoiceId,
      fields: { UF_CRM_SMART_INVOICE_1729361040: whatsappLink },
    });

    res.send(`✅ Счёт обновлён: <a href="${whatsappLink}" target="_blank">${whatsappLink}</a>`);
  } catch (err) {
    console.error("❌ Ошибка:", err?.response?.data || err.message);
    res.status(500).send("❌ Ошибка при обновлении счёта");
  }
});

// ========= Ping =========
app.get("/ping", (req, res) => {
  res.send("pong");
});

// ========= Запуск =========
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
