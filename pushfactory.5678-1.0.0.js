/*
	Push factory for beHub
*/

var entityos = require('entityos')
var _ = require('lodash')
var moment = require('moment');

module.exports = 
{
	VERSION: '0.0.1',

	init: function (param)
	{
		entityos.add(
		{
			name: 'push-get-data',
			code: function (param)
			{
				entityos.invoke('push-get-data-new-updated-devices');
			}
		});

		entityos.add(
		[
			{
				name: 'push-get-data-new-updated-devices',
				code: function (param, response)
				{
					var settings = entityos.get({scope: '_settings'});

					var productUpdatedNewDays = settings.push.productUpdatedNewDays;
					if (productUpdatedNewDays == undefined)
					{
						productUpdatedNewDays = 30
					}
					else
					{
						productUpdatedNewDays = parseInt(productUpdatedNewDays)
					}

					entityos.cloud.search(
					{
						object: 'product',
						fields:
						[
							{name: 'title'},
							{name: 'status'},
							{name: 'statustext'},
							{name: 'categorytext'},
							{name: 'modifieddate'},
							{name: 'createddate'},
							{name: 'guid'}
						],
						filters:
						[
							{
								field: 'modifieddate',
								comparison: 'GREATER_THAN_OR_EQUAL_TO',
								value: moment().subtract(productUpdatedNewDays, 'days').format('D MMM YYYY')
							}
						],
						rows: 99999,
						callback: 'push-get-data-new-updated-devices-response',
						callbackParam: param
					});
				}
			},
			{
				name: 'push-get-data-new-updated-devices-response',
				code: function (param, response)
				{
					if (response.status == 'OK')
					{
						var products = response.data.rows;

						_.each(products, function (product)
						{});

						entityos.set(
						{
							scope: 'push',
							context: 'data',
							name: 'products',
							value: products
						});

						entityos.invoke('push-get-data-new-learning-activity')
					}
				}
			}
		]);

		entityos.add(
		[
			{
				name: 'push-get-data-new-learning-activity',
				code: function (param, response)
				{
					var settings = entityos.get({scope: '_settings'});

					var products = entityos.get(
					{
						scope: 'push',
						context: 'data',
						name: 'products'
					});

					entityos.cloud.search(
					{
						object: 'action',
						fields:
						[
							{name: 'objectcontext'},
							{name: 'createduser'},
							{name: 'guid'}
						],
						filters:
						[
							{
								field: 'actiontype',
								comparison: 'IN_LIST',
								value: settings.push.actionTypeLearningActivity
							},
							{
								field: 'object',
								comparison: 'EQUAL_TO',
								value: settings.push.objects.product
							},
							{
								field: 'objectcontext',
								comparison: 'IN_LIST',
								value: _.join(_.map(products, 'id'), ',')
							}
						],
						rows: 99999,
						callback: 'push-get-data-new-learning-activity-response',
						callbackParam: param
					});
				}
			},
			{
				name: 'push-get-data-new-learning-activity-response',
				code: function (param, response)
				{
					if (response.status == 'OK')
					{
						var learningActivities = response.data.rows;

						_.each(learningActivities, function (learningActivity)
						{});

						entityos.set(
						{
							scope: 'push',
							context: 'data',
							name: 'learningActivities',
							value: learningActivities
						});

						entityos.invoke('push-prepare')
					}
				}
			}
		]);

		entityos.add(
		{
			name: 'push-prepare',
			code: function (param, response)
			{
				var template = 
				[
					'<body>',
						'<div style="background-color:#f3f3f4; margin:20px; padding:20px; border-radius:6px;">',
							'<div style="font-size:1.2rem; font-weight:bold;">Hello {{firstname}},</div>',
							'<div style="margin-top:20px; font-size:1rem; color:rgb(103, 106, 108);">{{devicesnewupdatedcount}} devices have been recently added or updated...</div>',
							'<div style="margin-top:16px;">',
								'{{devicesnewupdated}}',
							'</div>',
							'<div style="margin-top:20px; margin-bottom:0px;">',
								'<a href="https://app.behub.com.au" target="_blank">',
									'<div style="padding:10px; border-style:solid; background-color:#2a88bd; border-width:1px;',
										' width:80px; color:white; border-radius:5px; text-decoration:none; text-align:center; font-weight:bold;"',
										'>',
										'Log On',
									'</div>',
								'</a>',
							'</div>',	
						'</div>',
					'</body>'
				]

				var template = 
				[
					'<body>',
						'<div style="background-color:#f3f3f4; margin:8px; padding:20px; border-radius:6px;">',
							'<div style="font-size:1.2rem; font-weight:bold; margin-bottom: 16px;">Hello {{firstname}},</div>',
							'<table style="display: inline-block; width:260px; margin-right:20px; margin-bottom:18px; background-color:white; border-radius:4px;">',
								'<tr>',
									'<td>',
										'<div style="font-size:1.2rem; margin-top:14px; margin-left:14px; color:rgb(103, 106, 108); font-weight:bold;">For You</div>',
										'<div style="margin-top:4px; background-color:white; margin:2px; padding:12px; border-radius:4px;">',
											'<table>',
												'<tr>',
													'<td style="padding-bottom:4px; width:48px; text-align:center; font-size:2rem; font-weight:bold;">{{mydevicesnewupdatedcount}}</td>',
													'<td style="padding-bottom:4px;"> device(s) have been recently added or updated.</td>',
												'</tr>',
												'<tr>',
													'<td style="padding-top:10px; padding-bottom:4px; width:48px; text-align:center; font-size:2rem; font-weight:bold;">2</td>',
													'<td style="padding-top:10px; padding-bottom:4px;"> requests(s) to complete learning tasks.</td>',
												'</tr>',
											'</table>',
										'</div>',
									'</td>',
								'</tr>',
							'</table>',
							'<table style="display: inline-block;width:260px; margin-right:20px; margin-bottom:18px; background-color:white; border-radius:4px;">',
								'<tr>',
									'<td>',
										'<div style="font-size:1.2rem; margin-top:14px; margin-left:14px; color:rgb(103, 106, 108); font-weight:bold;">beHub</div>',
										'<div style="margin-top:4px; background-color:white; margin:2px; padding:12px; border-radius:4px;">',
											'<table>',
												'<tr>',
													'<td style="padding-bottom:4px; width:48px; text-align:center; font-size:2rem; font-weight:bold;">{{devicesnewupdatedcount}}</td>',
													'<td style="padding-bottom:4px;"> device(s) have been recently added or updated.</td>',
												'</tr>',
											'</table>',
										'</div>',
									'</td>',
								'</tr>',
							'</table>',
							'<div style="margin-top:0px; margin-bottom:0px;">',
								'<a href="https://behub-test-lab.entityos.cloud" target="_blank">',
									'<div style="padding:10px; border-style:solid; background-color:#2a88bd; border-width:1px;',
										' width:80px; color:white; border-radius:5px; text-decoration:none; text-align:center; font-weight:bold;"',
										'>',
										'Log On',
									'</div>',
								'</a>',
							'</div>',
							'<div style="margin-top:20px; margin-bottom:0px;">',
								'If you need any assistance please contact <a href="mailto:support@behub.com.au">support@behub.com.au</a>.  We love to help!',
							'</div>',		
						'</div>',
					'</body>'
				]

				entityos.set(
				{
					scope: 'push',
					context: 'template',
					value: template.join('')
				});

				entityos.invoke('push-prepare-messages');
			}
		});

		entityos.add(
		{
			name: 'push-prepare-messages',
			code: function (param)
			{
				var users = entityos.get(
				{
					scope: 'push',
					context: 'users'
				});

				var data = entityos.get(
				{
					scope: 'push',
					context: 'data'
				});

				var template = entityos.get(
				{
					scope: 'push',
					context: 'template'
				});

				var messages = [];
				var includeUser;

				_.each(users, function (user)
				{
					includeUser = true;

					var userLearningActivity = _.filter(data.learningActivities, function (learningActivity)
					{
						return (learningActivity.createduser == user.id)
					});

					//if (includeUser) {includeUser = (userLearningActivity.length != 0)}

					if (includeUser)
					{
						var templateData = user;

						var devicesNewUpdated = data.products;

						var userDevicesNewUpdated = _.filter(devicesNewUpdated, function (device)
						{	
							return (_.find(userLearningActivity, function(activity) {return activity.objectcontext == device.id}) != undefined)
						});

						var html = ['<ul>']

						_.each(userDevicesNewUpdated, function (device)
						{
							html.push('<li>' + device.title + '</li>');
						})

						html.push('</ul>');

						var userData =
						{
							mydevicesnewupdatedcount: 0,
							devicesnewupdatedcount: userDevicesNewUpdated.length,
							devicesnewupdated: html.join('')
						};

						templateData = _.assign(templateData, userData);
						 
						entityos._util.message(
						[
							'-',
							'TEMPLATE DATA:',
							templateData
						]);

						var message = _.clone(template);

						_.each(templateData, function (value, key)
						{
							message = _.replace(message, '{{' + key + '}}', value);
						});

						messages.push(
						{
							to: user.email,
							fromemail: 'support@behub.com.au',
							subject: '[beHub] Updates',
							message: message
						});
					}
				});

				entityos.set(
				{
					scope: 'push',
					context: 'messages',
					value: messages
				});

				entityos._util.message(
				[
					'-',
					'MESSAGES:',
					messages
				]);

				entityos.invoke('push-send-messages');
			}
		});
	}
}