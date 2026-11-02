const express = require("express");
const controller = require("../controllers/transactionController");
const router = express.Router();

router.post("/import/parse", controller.parseCsv);
router.post("/", controller.createTransaction);
router.get("/:userId", controller.listTransactions);
router.delete("/:userId/:transactionId", controller.deleteTransaction);

module.exports = router;
