import axios from "axios";
import crypto from "crypto";

const SYMBOL = "BTCUSDT";
const PERIOD = 14; // RSI period - 14 candles

const API_URL = "https://testnet.binance.vision"; //'https://api.binance.com';

let isOpened = false;

/*
Formula do RSI (Índice de Força Relativa)

A fórmula do RSI é baseada na média de ganhos e perdas do período. Ela serve para medir a força de uma tendência, indicando se um ativo está sobrecomprado ou sobrevendido.

Ela é calculada da seguinte forma:

RSI = 100 - (100 / (1 + RS))

RS = Average Gain / Average Loss

onde:
- Average Gain é a média de ganhos do período
- Average Loss é a média de perdas do período
- RS é a relação entre Average Gain e Average Loss
- RSI é o Índice de Força Relativa
*/

// calculate media de Gain e Loss
async function avarege(prices: number[], period: number, startIdx: number) {
	let gain = 0;
	let loss = 0;

	for (let i = 0; i < period && i + startIdx < prices.length; i++) {
		const diff = prices[i + startIdx] - prices[i + startIdx - 1];

		if (diff > 0) {
			gain += diff; // se o valor for positivo, é um ganho
		} else {
			loss += Math.abs(diff); // Math.abs() retorna o valor absoluto
		}
	}

	return {
		gain: gain / period, // media de ganho
		loss: loss / period, // media de perda
	};
}

// calculate RSI -- Índice de Força Relativa
// vai ser utilizado media aritmetica exponencial (EMA) para calcular o RSI, o que torna o RSI mais sensível a mudanças de preço recentes do que a média simples.
async function rsi(prices: number[], period: number) {
	let avgGains = 0;
	let avgLoss = 0;

	for (let i = 1; i < prices.length; i++) {
		const avgs = await avarege(prices, period, i);

		if (i === 1) {
			avgGains = avgs.gain;
			avgLoss = avgs.loss;
			continue;
		}

		avgGains = (avgGains * (period - 1) + avgs.gain) / period;
		avgLoss = (avgLoss * (period - 1) + avgs.loss) / period;
	}

	const rs = avgGains / avgLoss;
	const rsi = 100 - 100 / (1 + rs);
	return rsi;
}

// Função para realizar a abertura de ordem
async function newOrder(symbol: string, quantity: number, side: string) {
	const order = {
		symbol,
		quantity,
		side,
		type: "MARKET",
		timestamp: Date.now(),
	};

	console.log(order);

	const signature = crypto
		.createHmac("sha256", process.env.BINANCE_API_SECRET)
		.update(new URLSearchParams(order).toString())
		.digest("hex");

	order.signature = signature;

	const headers = {
		"X-MBX-APIKEY": process.env.BINANCE_API_KEY,
	};

	try {
		const { data } = await axios.post(
			`${API_URL}/api/v3/order`,
			new URLSearchParams(order).toString(),
			{ headers },
		);
		console.log(data);
	} catch (err) {
		console.error(err.response.data);
	}
}

// Função para iniciar o bot
async function start() {
	const { data } = await axios.get(
		`${API_URL}/api/v3/klines?symbol=${SYMBOL}&interval=15m&limit=100`,
	);
	const candle = data[data.length - 1];
	const lastPrice = Number.parseFloat(candle[4]);

	const prices = data.map((c) => Number.parseFloat(c[4]));

	const rsiValue = await rsi(prices, PERIOD);

	console.clear();
	console.log(`Price: ${lastPrice}`);
	console.log(`RSI: ${rsiValue}`);
	console.log(`Is Opened: ${isOpened}`);

	await newOrder(SYMBOL, 0.001, "BUY");
	process.exit(0);

	if (rsiValue < 30 && !isOpened) {
		console.log("sobrevendido, Abrir Ordem de Compra");
		isOpened = true;
		await newOrder(SYMBOL, 0.001, "BUY");
	} else if (rsiValue > 70 && isOpened) {
		console.log("sobrecomprado, Abrir Ordem de Venda");
		await newOrder(SYMBOL, 0.001, "SELL");
		isOpened = false;
	} else {
		console.log("Aguardar");
	}
}

setInterval(start, 3000);

start();
