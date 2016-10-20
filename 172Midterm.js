var csv = require('csv');
var request = require('request');
var repl = require('repl');
var uu = require('underscore');

function get_exchange_rate(symb) //gets exchange rate, symbol is checked beforehand so should always be valid
{

	symb = symb.replace(/\n$/, ''); //chops off the extra \n repl adds
	var buy = symb + '_to_btc'; 	//create two strings, one to find buy rate and one for sell rate
	var sell = 'btc_to_' + symb;
	request('https://api.coinbase.com/v1/currencies/exchange_rates', function (error, response, body){
		if (!error && response.statusCode == 200) {
			var exchange_rates = JSON.parse(body);
			return [exchange_rates[buy], exchange_rates[sell]];
		}
		else
		{
			console.log("There was an error with the request.");
		}
	})
}

function currency_validation(symb)
{
	symb = symb.replace(/\n$/, ''); //chops off the extra \n repl adds
	request('https://api.coinbase.com/v1/currencies', function (error, response, body){
		if (!error && response.statusCode == 200) {
			var currencies = JSON.parse(body);
			currencies = uu.flatten(currencies);
			if(uu.find(currencies, function (curr) {return curr == symb}))
			{
			 	console.log("Curreny valid.");
			} 
			else
			{
				console.log("No known exchange rate for BTC/" + symb + ". Order failed.");
			}
		}
		else
		{
			console.log("There was an error with the request.");
		}
	})
}

repl.start({eval: get_exchange_rate});