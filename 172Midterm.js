var csv = require('csv')
var request = require('request')
var repl = require('repl')
var uu = require('underscore')
var order_buffer = []

/*
Take user input
|
->validate currency
 |
 ->get exchange rate
  |
  ->queue buy
  |
  ->queue sell
->save orders
*/

function entry(cmd)
{
	cmd = cmd.replace(/\n$/, '') //chops off /n added from REPL
	var args = cmd.split(" ") // [action, amount, symb]
	if(args[0] == "ORDERS")
	{
		save_orders();
	}
	else
	{
		validation(args[0], args[1], args[2])
	}
}

function validation(action, amount, symb)
{
	var order = {
		"command": action,
		"amount": amount,
		"currency": symb
	}
	console.log(order)
	if(!isNaN(amount) && amount > 0) //checks if a valid amount was specified
	{
		if(symb !== undefined)
		{
			var SYMB = symb.toUpperCase()
			request('https://api.coinbase.com/v1/currencies', function (error, response, body){
				if (!error && response.statusCode == 200) {
					var currencies = JSON.parse(body)
					currencies = uu.flatten(currencies)
					if(uu.find(currencies, function (curr) {return curr == SYMB}))
					{
					 	console.log("Currency valid.")
					 	transaction(action, amount, symb)
					} 
					else
					{
						console.log("No known exchange rate for BTC/" + SYMB + ". Order failed.")				
					}
				}
				else
				{
					console.log("There was an error with the request.")
				}
			})
		}
		else
		{
			if(action == "BUY") 
			{
				console.log("Order to BUY " + amount + " BTC queued.")
				order_buffer.push(order)
			}
			else if (action == "SELL") 
			{
				console.log("Order to SELL " + amount + " BTC queued.")
				order_buffer.push(order)
			}
			else console.log("Invalid action.")
		}
	}
	else
	{
		console.log("No amount specified.")
	}
}

function transaction(action, amount, symb)
{
	var buy = 'btc_to_' + symb 	//create two strings, one to find buy rate and one for sell rate
	var sell = symb + '_to_btc'
	request('https://api.coinbase.com/v1/currencies/exchange_rates', function (error, response, body){
		if (!error && response.statusCode == 200) {
			var exchange_rates = JSON.parse(body)
			if(action == 'BUY')
			{
				console.log("order to BUY " + amount + " worth of BTC queued @ " + exchange_rates[buy] + ' BTC/' + symb.toUpperCase() + ' (' + (exchange_rates[buy]*amount) + ' BTC)')
			}
			else if(action == 'SELL')
			{
				console.log("order to SELL " + amount + " worth of BTC queued @ " + exchange_rates[sell] + ' ' + symb.toUpperCase() + '/BTC' + ' (' + (exchange_rates[sell]*amount) + ' BTC)')
			}
			else
			{
				console.log("Invalid action.")
			}
		}
		else
		{
			console.log("There was an error with the request.")
		}
	})
}

function save_orders()
{
	console.log(order_buffer)
}

repl.start({prompt: "coinbase>", eval:entry})