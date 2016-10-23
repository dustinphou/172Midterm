var csv = require('fast-csv')
var request = require('request')
var repl = require('repl')
var uu = require('underscore')
var path = require('path')
var fs = require('fs')
var orderBuffer = []
var filePath = path.join(__dirname, 'orders.csv')

var weekday = new Array(7);
weekday[0] = "Sun";
weekday[1] = "Mon";
weekday[2] = "Tue";
weekday[3] = "Wed";
weekday[4] = "Thu";
weekday[5] = "Fri";
weekday[6] = "Sat";

var month = new Array(12);
month[0] = "Jan";
month[1] = "Feb";
month[2] = "Mar";
month[3] = "Apr";
month[4] = "May";
month[5] = "Jun";
month[6] = "Jul";
month[7] = "Aug";
month[8] = "Sep";
month[9] = "Oct";
month[10] = "Nov";
month[11] = "Dec";



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

function entry(cmd) //assumptions: all inputs will be given in ALL CAPS
{
	cmd = cmd.replace(/\n$/, '') //chops off /n added from REPL
	var args = cmd.split(' ') // [action, amount, symb]
	if(args[0] == 'ORDERS')
	{
		save_orders();
	}
	else
	{
		validation(args[0], args[1], args[2], cmd)
	}
}

function validation(action, amount, symb, order)
{
	if(!isNaN(amount) && amount > 0) //checks if a valid amount was specified
	{
		if(symb !== undefined)
		{
			request('https://api.coinbase.com/v1/currencies', function (error, response, body){
				if (!error && response.statusCode == 200) {
					var currencies = JSON.parse(body)
					currencies = uu.flatten(currencies)
					if(uu.find(currencies, function (curr) {return curr == symb}))
					{
					 	console.log('Currency valid.')
					 	transaction(action, amount, symb, order)
					} 
					else
					{
						console.log('No known exchange rate for BTC/' + symb + '. Order failed.')				
					}
				}
				else
				{
					console.log('There was an error with the request.')
				}
			})
		}
		else
		{
			order = order + ' BTC'
			if(action == 'BUY') 
			{
				console.log('Order to BUY ' + amount + ' BTC queued.')
				orderBuffer.push(append_date_time(order) + ' : undefined')
			}
			else if (action == 'SELL') 
			{
				console.log('Order to SELL ' + amount + ' BTC queued.')
				orderBuffer.push(append_date_time(order) + ' : undefined')
			}
			else console.log('Invalid action.')
		}
	}
	else
	{
		console.log('No amount specified.')
	}
}

function transaction(action, amount, symb, order)
{
	var low_symb = symb.toLowerCase()
	var buy = 'btc_to_' + low_symb 	//create two strings, one to find buy rate and one for sell rate
	var sell = low_symb + '_to_btc'
	request('https://api.coinbase.com/v1/currencies/exchange_rates', function (error, response, body){
		if (!error && response.statusCode == 200) {
			var exchange_rates = JSON.parse(body)
			if(action == 'BUY')
			{
				console.log('order to BUY ' + amount + ' worth of BTC queued @ ' + exchange_rates[buy] + ' BTC/' + symb.toUpperCase() + ' (' + (exchange_rates[buy]*amount) + ' BTC)')
				orderBuffer.push(append_date_time(order) + ' : ' + exchange_rates[buy])
			}
			else if(action == 'SELL')
			{
				console.log('order to SELL ' + amount + ' worth of ' + symb + ' queued @ ' + exchange_rates[sell] + ' ' + symb.toUpperCase() + '/BTC' + ' (' + (exchange_rates[sell]*amount) + ' BTC)')
				orderBuffer.push(append_date_time(order) + ' : ' + exchange_rates[sell])
			}
			else
			{
				console.log('Invalid action.')
			}

		}
		else
		{
			console.log('There was an error with the request.')
		}
	})
}

function append_date_time(order)
{
	//Wed Oct 05 2016 22:09:40 GMT+0000 (UTC) : BUY 10 : UNFILLED
	//Weekday Month Day Year Time Timezone : order : UNFILLED
	var d = new Date();
	order = weekday[d.getUTCDay()] + ' ' + month[d.getUTCMonth()] + ' ' + d.getUTCDate() + ' ' + d.getUTCFullYear() + ' ' + d.getUTCHours() + ':' + d.getUTCMinutes() + ':' + d.getUTCSeconds() + ' : ' + order
	return order
}

function save_orders()
{
	var csvBuffer = uu.map(orderBuffer, function (order) {
		var splitorder = order.split(' : ')
		var splitcmd = splitorder[1].split(' ')
		var csvorder = {
		"timestamp":splitorder[0],
		"command":splitcmd[0],
		"amount":splitcmd[1],
		"currency":splitcmd[2],
		"exchange rate to BTC": splitorder[2]
		}
		return csvorder
	})

var writableStream = fs.createWriteStream(filePath)
csv.write(csvBuffer, {headers:true}).pipe(writableStream)

}

repl.start({prompt: 'coinbase>', eval:entry})