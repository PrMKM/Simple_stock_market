import Fastify from 'fastify';
import redis from './redis';

const server = Fastify({ logger: true });
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

server.post('/wallets/:wallet_id/stocks/:stock_name', async (request, reply) => {
    const { wallet_id, stock_name } = request.params as any;
    const { type } = request.body as any;

    const bankKey = `bank:stocks`;
    const walletKey = `wallet:${wallet_id}:stocks`;
    const logKey = `audit_log`;

    const bankQty = await redis.hget(bankKey, stock_name);
    if (bankQty === null) return reply.code(404).send({ error: "Stock not found" });

    const currentBankQty = parseInt(bankQty);
    const walletQty = parseInt(await redis.hget(walletKey, stock_name) || "0");

    if (type === 'buy') {
        if (currentBankQty <= 0) return reply.code(400).send({ error: "No stock in bank" });
        
        await redis.multi()
            .hincrby(bankKey, stock_name, -1)
            .hincrby(walletKey, stock_name, 1)
            .rpush(logKey, JSON.stringify({ type, wallet_id, stock_name }))
            .exec();
    } else if (type === 'sell') {
        if (walletQty <= 0) return reply.code(400).send({ error: "No stock in wallet" });

        await redis.multi()
            .hincrby(bankKey, stock_name, 1)
            .hincrby(walletKey, stock_name, -1)
            .rpush(logKey, JSON.stringify({ type, wallet_id, stock_name }))
            .exec();
    }

    return reply.code(200).send({ status: "success" });
});

server.get('/wallets/:wallet_id', async (request) => {
    const { wallet_id } = request.params as any;
    const stocksMap = await redis.hgetall(`wallet:${wallet_id}:stocks`);
    
    const stocks = Object.entries(stocksMap).map(([name, quantity]) => ({
        name,
        quantity: parseInt(quantity)
    }));

    return { id: wallet_id, stocks };
});

server.get('/wallets/:wallet_id/stocks/:stock_name', async (request) => {
    const { wallet_id, stock_name } = request.params as any;
    const qty = await redis.hget(`wallet:${wallet_id}:stocks`, stock_name);
    return parseInt(qty || "0");
});

server.get('/stocks', async () => {
    const stocksMap = await redis.hgetall(`bank:stocks`);
    const stocks = Object.entries(stocksMap).map(([name, quantity]) => ({
        name,
        quantity: parseInt(quantity)
    }));
    return { stocks };
});

server.post('/stocks', async (request) => {
    const { stocks } = request.body as any;
    await redis.del(`bank:stocks`);
    for (const s of stocks) {
        await redis.hset(`bank:stocks`, s.name, s.quantity);
    }
    return { status: "success" };
});

server.get('/log', async () => {
    const logs = await redis.lrange(`audit_log`, 0, 9999);
    return { log: logs.map(l => JSON.parse(l)) };
});

server.post('/chaos', async () => {
    setTimeout(() => process.exit(1), 100);
    return { message: "Instance killing..." };
});

server.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
});