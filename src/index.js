const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(express.json());

const customers = []

function verifyIfExistsAccountCpf(req, res, next) {
	const { cpf } = req.headers;

	const customer = customers.find(customer => customer.cpf === cpf);

	if(!customer) {
		return res.json({ erro: 'customer not found' });
	}

	req.customer = customer;

	return next();
}

function getBalance(statement) {
	const balance = statement.reduce((acc, operation) => {
		if(operation.type === 'credit') {
			return acc + operation.amount;
		} else {
			return acc - operation.amount;
		}
	}, 0)

	return balance;
} 

app.post('/account', (req, res) => {
	const { cpf, name, balance } = req.body;

	const customerAlreadyExists = customers.some(
		customer => customer.cpf === cpf
	);

	if(customerAlreadyExists) {
		return res.status(400).json({erro: 'Customer already exists'});
	}

	customers.push({
		name,
		cpf,
		id: uuidv4(),
		balance,
		statement: []
	});

	return res.status(201).send()
});

app.get('/account', verifyIfExistsAccountCpf, (req, res) => {
	const { customer } = req;

	const balance = getBalance(customer.statement);
	customer.balance = balance;

	return res.status(201).json(customer)
});

app.delete('/account', verifyIfExistsAccountCpf, (req, res) => {
	const { customer } = req;

	customers.splice( customer, 1 );

	return res.status(204).json(customers);
});

app.put('/customAccount', verifyIfExistsAccountCpf, (req, res) => {
	const { name } = req.body;
	const { customer } = req;
	
	customer.name = name

	return res.status(201).send()
});

app.get('/statement', verifyIfExistsAccountCpf, (req, res) => {
	const { customer } = req;	

	return res.status(200).json(customer.statement)
});

app.get('/statement/date', verifyIfExistsAccountCpf, (req, res) => {
	const { customer } = req;	
	const { date } = req.query;

	const dateFormat = new Date(date + " 00:00");

	const statement = customer.statement.filter((statement) => 
		statement.created_at.toDateString() === 
		new Date(dateFormat).toDateString() 
	);

	return res.status(200).json(statement)
});

app.post('/deposit', verifyIfExistsAccountCpf, (req, res) => {
	const { amount, description } = req.body;
	const { customer } = req;

	const statementOperation = {
		description,
		amount,
		created_at: new Date(),
		type: 'credit'
	}

	customer.statement.push(statementOperation);

	return res.status(201).send();
});

app.post('/withdraw', verifyIfExistsAccountCpf,  (req, res) => {
	const { amount } = req.body;
	const { customer } = req;

	const balance = getBalance(customer.statement);

	if (balance < amount) {
		return res.status(400).json({erro: "Insuficient funds!"})
	} 

	const statementOperation = {
		amount,
		created_at: new Date(),
		type: 'debit'
	}

	customer.statement.push(statementOperation);

	return res.status(200).send()
});

app.get('/balance', verifyIfExistsAccountCpf, (req, res) => {
	const { customer } = req;

	const balance = getBalance(customer.statement);

	res.balance = balance

	return res.json(balance);
});


app.listen(3333);