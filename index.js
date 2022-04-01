/*
	This is node app to push messages to users based on an automation rule set up using
	https://console.entityos.cloud > 

	https://www.npmjs.com/package/lambda-local:

	lambda-local -l index.js -t 9000 -e event-1234.json
	lambda-local -l index.js -t 9000 -e event-5678.json

	Also see learn.js for more example code using the entityos node module.
*/

exports.handler = function (event, context, callback)
{
	var entityos = require('entityos')
	var _ = require('lodash')
	var moment = require('moment');

	entityos.set(
	{
		scope: 'push',
		context: '_event',
		value: event
	});

	//Event: {"site": "2007"}

	entityos.set(
	{
		scope: 'push',
		context: '_context',
		value: context
	});

	entityos.set(
	{
		scope: '_callback',
		value: callback
	});

	var settings;

	if (event != undefined)
	{
		if (event.site != undefined)
		{
			settings = event.site;
			//ie use settings-[event.site].json
		}
		else
		{
			settings = event;
		}
	}

	entityos._util.message(
	[
		'-',
		'EVENT-SETTINGS:',
		settings
	]);

	entityos.init(main, settings)

	entityos._util.message('Using entityos module version ' + entityos.VERSION);
	
	function main(err, data)
	{
		var settings = entityos.get({scope: '_settings'});

		entityos._util.message(
		[
			'-',
			'SETTINGS:',
			settings
		]);

		if (settings.push.namespace != undefined)
		{
			entityos._util.message(
			[
				'-',
				'NAMESPACE:',
				settings.push.namespace
			]);

			var pushfactory = require('./pushfactory.' + settings.push.namespace + '.js');
		}
		
		pushfactory.init()

		entityos.add(
		{
			name: 'push-get-recipients',
			code: function (param, response)
			{
				var settings = entityos.get({scope: '_settings'});

				if (settings.push == undefined)
				{}
				else
				{
					entityos.cloud.search(
					{
						object: 'messaging_automation_recipient',
						fields:
						[
							{name: 'role'},
							{name: 'user'}
						],
						filters:
						[
							{
								field: 'automationtext',
								comparison: 'EQUAL_TO',
								value: settings.push.automationName
							}
						],
						callback: 'push-get-recipients-response'
					});
				}
			}
		});

		entityos.add(
		{
			name: 'push-get-recipients-response',
			code: function (param, response)
			{
				if (response.status == 'OK')
				{
					entityos.set(
					{
						scope: 'push',
						context: 'recipients',
						value: response.data.rows
					});
				}

				entityos.invoke('push-process-recipients');
			}
		});

		entityos.add(
		{
			name: 'push-process-recipients',
			code: function (param, response)
			{
				var recipients = entityos.get(
				{
					scope: 'push',
					context: 'recipients'
				});

				if (recipients == undefined)
				{}
				else
				{
					var users = [];
					var roles = [];

					_.each(recipients, function (recipient)
					{
						if (recipient.user != '')
						{
							users.push(recipient.user)
						}
						else
						{
							roles.push(recipient.role)
						}
					});

					entityos.set(
					{
						scope: 'push',
						context: 'userIDs',
						value: users
					});

					if (roles.length == 0)
					{
						entityos.invoke('push-process-recipients-get-users')
					}
					else
					{
						entityos.cloud.search(
						{
							object: 'setup_user_role',
							fields:
							[
								{name: 'user'}
							],
							filters:
							[
								{
									field: 'role',
									comparison: 'IN_LIST',
									value: roles.join(',')
								}
							],
							rows: 999999,
							callback: 'push-process-recipients-process-roles'
						});
					}
				}
			}
		});

		entityos.add(
		{
			name: 'push-process-recipients-process-roles',
			code: function (param, response)
			{
				var userIDs = entityos.get(
				{
					scope: 'push',
					context: 'userIDs'
				});

				var roleUsers = _.map(response.data.rows, 'user');

				userIDs = _.concat(userIDs, roleUsers);

				entityos.set(
				{
					scope: 'push',
					context: 'userIDs',
					value: userIDs
				});

				entityos.invoke('push-process-recipients-get-users');
			}
		});

		entityos.add(
		{
			name: 'push-process-recipients-get-users',
			code: function (param)
			{
				var userIDs = entityos.get(
				{
					scope: 'push',
					context: 'userIDs'
				});

				entityos.cloud.search(
				{
					object: 'setup_user',
					fields:
					[
						{name: 'username'},
						{name: 'user.contactperson.firstname'},
						{name: 'user.contactperson.surname'},
						{name: 'user.contactperson.email'},
						{name: 'user.contactperson.mobile'}
					],
					filters:
					[
						{
							field: 'id',
							comparison: 'IN_LIST',
							value: userIDs.join(',')
						}
					],
					rows: 999999,
					callback: 'push-process-recipients-get-users-response'
				});

			}
		});

		entityos.add(
		{
			name: 'push-process-recipients-get-users-response',
			code: function (param, response)
			{
				if (response.status == 'OK')
				{
					var users = _.map(response.data.rows, function (row)
					{
						return {
							id: row['id'],
							username: row['username'],
							firstname: row['user.contactperson.firstname'],
							surname: row['user.contactperson.surname'],
							lastname: row['user.contactperson.surname'],
							email: row['user.contactperson.email'],
							mobile: row['user.contactperson.mobile'] }
					})

					entityos.set(
					{
						scope: 'push',
						context: 'users',
						value: users
					});
				}

				entityos._util.message(
				[
					'-',
					'Users',
					users
				]);

				entityos.invoke('push-get-data');
			}
		});

		entityos.add(
		[
			{
				name: 'push-send-messages',
				code: function (param)
				{
					var messages = entityos.get(
					{
						scope: 'push',
						context: 'messages'
					});

					entityos._util.message(
					[
						'-',
						'MESSAGES:',
						messages
					]);

					entityos.set(
					{
						scope: 'push-send-messages',
						context: 'index',
						value: 0
					});

					entityos.invoke('push-send-messages-process')
				}
			},
			{
				name: 'push-send-messages-process',
				code: function (param)
				{
					var messages = entityos.get(
					{
						scope: 'push',
						context: 'messages'
					});

					var index = entityos.get(
					{
						scope: 'push-send-messages',
						context: 'index'
					});

					if (index < messages.length)
					{
						var message = messages[index];

						entityos.cloud.invoke(
						{
							method: 'messaging_email_send',
							data: message,
							callback: 'push-send-message-next'
						});
					}
					else
					{
						entityos.invoke('push-send-messages-finalise');
					}
				}
			},
			{
				name: 'push-send-message-next',
				code: function (param, response)
				{
					if (response.status == 'ER')
					{
						entityos.invoke('util-log',
						{
							data: JSON.stringify(response.error.errornotes),
							notes: '[Push] Send Error'
						});
					}

					var index = entityos.get(
					{
						scope: 'push-send-messages',
						context: 'index'
					});

					entityos.set(
					{
						scope: 'push-send-messages',
						context: 'index',
						value: index + 1
					});

					entityos.invoke('push-send-messages-process');
				}
			}
		]);

		entityos.add(
		{
			name: 'push-send-messages-finalise',
			code: function (param, response)
			{
				var messages = entityos.get(
				{
					scope: 'push',
					context: 'messages'
				});

				var data = 
				{
					status: 'OK',
					emailsSent: messages.length
				}
				
				entityos._util.message(data);
				entityos.invoke('util-end', data)
			}
		});

		entityos.add(
		{
			name: 'util-log',
			code: function (data)
			{
				entityos.cloud.save(
				{
					object: 'core_debug_log',
					data: data
				});
			}
		});

		entityos.add(
		{
			name: 'util-end',
			code: function (data, error)
			{
				var callback = entityos.get(
				{
					scope: '_callback'
				});

				if (error == undefined) {error = null}

				if (callback != undefined)
				{
					callback(error, data);
				}
			}
		});

		/* PROCESS STARTS HERE! */
		
		entityos.invoke('push-get-recipients');
	}
}