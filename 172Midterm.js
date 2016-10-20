var csv = require('csv');
var request = require('request');
var repl = require('repl');
var uu = require('underscore');

function currency_validation(symb)
{
	symb = symb.replace(/\n$/, '');
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

repl.start({eval: currency_validation});