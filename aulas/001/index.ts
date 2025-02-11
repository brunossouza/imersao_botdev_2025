import axios from "axios";

const SYMBOL = "BTCUSDT";
const BUY_PRICE = 95901;
const SELL_PRICE = 95920;

const API_URL = "https://testnet.binance.vision"; //'https://api.binance.com';

let isOpened = false;

async function start() {
	const { data } = await axios.get(
		`${API_URL}/api/v3/klines?symbol=${SYMBOL}&interval=15m&limit=20`,
	);
	const candle = data[data.length - 1];

	const price = Number.parseFloat(candle[4]);

	console.clear();
	console.log(`Price: ${price}`);

	if (price <= BUY_PRICE && !isOpened) {
		console.log("Buy");
		isOpened = true;
	} else if (price >= SELL_PRICE && isOpened) {
		console.log("Sell");
		isOpened = false;
	}else{
		console.log("Waiting");
	}
		
}

setInterval(start, 3000);

start();
