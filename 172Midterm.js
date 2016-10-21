var csv = require('csv')
var request = require('request')
var repl = require('repl')
var uu = require('underscore')

/*
Take user input
|
->validate currency
 |
 ->get exchange rate
  |
  ->buy
  |
  ->sell
*/

function currency_validation(action, amount, symb)
{
	//symb = symb.replace(/\n$/, '') //chops off the extra \n repl adds
	var SYMB = symb.toUpperCase()
	return request('https://api.coinbase.com/v1/currencies', function (error, response, body){
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

function transaction(action, amount, symb) //gets exchange rate, symbol is checked beforehand so should always be valid
{

	//symb = symb.replace(/\n$/, '') //chops off the extra \n repl adds
	var buy = symb + '_to_btc' 	//create two strings, one to find buy rate and one for sell rate
	var sell = 'btc_to_' + symb
	request('https://api.coinbase.com/v1/currencies/exchange_rates', function (error, response, body){
		if (!error && response.statusCode == 200) {
			var exchange_rates = JSON.parse(body)
			// var rates_for_symb = {buy:exchange_rates[buy], sell:exchange_rates[sell]}
			// console.log(rates_for_symb)
			if(action == 'BUY')
			{
				console.log("BUY " + amount +" BTC for " + (exchange_rates[buy]*amount) + ' ' +symb.toUpperCase())
			}
			else if(action == 'SELL')
			{
				console.log("SELL " + amount +" BTC for " + (exchange_rates[sell]*amount) + ' ' +symb.toUpperCase())
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


var args = process.argv.slice(2)
console.log(args)
currency_validation(args[0], args[1], args[2])
// repl.start({prompt: "coinbase>", eval:function(cmd, context, filename, callback) {
//         if (cmd === empty) return callback()
//         var result = eval(cmd)
//     	console.log(result)
//         callback(null, result)
//       }})