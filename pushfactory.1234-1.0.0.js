/*
	Push factory for project task statuses
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
				entityos.invoke('push-get-data-project-tasks')
			}
		});

		entityos.add(
		{
			name: 'push-get-data-project-tasks',
			code: function (param, response)
			{
				var settings = entityos.get({scope: '_settings'});

				entityos.cloud.search(
				{
					object: 'project_task',
					fields:
					[
						{name: 'taskby'},
						{name: 'status'},
						{name: 'statustext'},
						{name: 'startdate'},
						{name: 'enddate'}
					],
					filters:
					[
						{
							field: 'status',
							comparison: 'NOT_IN_LIST',
							value: settings.push.taskStatusesClosed
						}
					],
					rows: 99999,
					callback: 'push-get-data-project-tasks-response',
					callbackParam: param
				});
			}
		});

		entityos.add(
		{
			name: 'push-get-data-project-tasks-response',
			code: function (param, response)
			{
				if (response.status == 'OK')
				{
					var tasks = response.data.rows;

					_.each(tasks, function (task)
					{
						task.date = task.enddate;
						if (task.date == '') {task.date = task.startdate}
					});

					entityos.set(
					{
						scope: 'push',
						context: 'data',
						name: 'tasks',
						value: tasks
					});

					entityos.invoke('push-prepare')
				}
			}
		});

		entityos.add(
		{
			name: 'push-prepare',
			code: function (param, response)
			{
				var template = 
				[
					'<body>',
						'<div style="background-color:#f3f3f4; margin:8px; padding:20px; border-radius:6px;">',
							'<div style="font-size:1.2rem; font-weight:bold; margin-bottom: 12px;">Hello {{firstname}},</div>',
							'<table style="display: inline-block; width:260px; margin-right:20px; margin-bottom:18px; background-color:white; border-radius:4px;">',
								'<tr>',
									'<td>',
										'<div style="font-size:1rem; margin-top:14px; margin-left:14px; color:rgb(103, 106, 108);">You have ...</div>',
										'<div style="margin-top:4px; background-color:white; margin:2px; padding:12px; border-radius:4px;">',
											'<table>',
												'<tr>',
													'<td style="margin-bottom:4px; width:28px; text-align:center;">{{mytasksactive}}</td>',
													'<td style="margin-bottom:4px;"> active task(s).</td>',
												'</tr>',
												'<tr>',
													'<td style="margin-bottom:4px; width:28px; text-align:center;">{{mytasksduesoon}}</td>',
													'<td style="margin-bottom:4px;"> task(s) due soon.</td>',
												'</tr>',
												'<tr>',
													'<td style="margin-bottom:4px; width:28px; text-align:center;">{{mytasksoverdue}}</td>',
													'<td style="margin-bottom:4px;"> task(s) overdue.</td>',
												'</tr>',
											'</table>',
										'</div>',
									'</td>',
								'</tr>',
							'</table>',
							'<table style="display: inline-block;width:260px; margin-right:20px; margin-bottom:18px; background-color:white; border-radius:4px;">',
								'<tr>',
									'<td>',
										'<div style="margin-top:14px; font-size:1rem; margin-left: 14px; color:rgb(103, 106, 108);">As a community there are ...</div>',
										'<div style="margin-top:4px; background-color:white; margin:2px; padding:12px; border-radius:4px;">',
											'<table>',
												'<tr>',
													'<td style="margin-bottom:4px; width:28px; text-align:center;">{{communitytasksactive}}</td>',
													'<td style="margin-bottom:4px;"> active task(s).</td>',
												'</tr>',
												'<tr>',
													'<td style="margin-bottom:4px; width:28px; text-align:center;">{{communitytasksduesoon}}</td>',
													'<td style="margin-bottom:4px;"> task(s) due soon.</td>',
												'</tr>',
												'<tr>',
													'<td style="margin-bottom:4px; width:28px; text-align:center;">{{communitytasksoverdue}}</td>',
													'<td style="margin-bottom:4px;"> task(s) overdue.</td>',
												'</tr>',
											'</table>',
										'</div>',
									'</td>',
								'</tr>',
							'</table>',
							'<div style="margin-top:0px; margin-bottom:0px;">',
								'<a href="https://journal.ths.community" target="_blank">',
									'<div style="padding:10px; border-style:solid; background-color:#2a88bd; border-width:1px;',
										' width:80px; color:white; border-radius:5px; text-decoration:none; text-align:center; font-weight:bold;"',
										'>',
										'Log On',
									'</div>',
								'</a>',
							'</div>',
							'<div style="margin-top:20px; margin-bottom:0px;">',
								'If you need any assistance with tasks that were initiated via <a href="https://improve.ths.community" target="_blank">',
									'improve.ths</a>,',
								' then please contact the Simon @ <a href="mailto:pandcgeneralmanager@ths.community">pandcgeneralmanager@ths.community</a>.',
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

				_.each(users, function (user)
				{
					var templateData = user;

					var myTasksActive = _.filter(data.tasks, function (task)
					{
						return task.taskby == user.id
					});

					var myTasksDueSoon = _.filter(myTasksActive, function (task)
					{
						return 	(
										moment(task.date, 'D MMM LT').isAfter(moment())
										&& moment(task.date, 'D MMM LT').isBefore(moment().add(5, 'days'))
									)
					}); 

					var myTasksOverDue = _.filter(myTasksActive, function (task)
					{
						return moment(task.date, 'D MMM LT').isBefore(moment())
					}); 

					var communityTasksActive = data.tasks;

					var communityTasksDueSoon = _.filter(communityTasksActive, function (task)
					{
						return 	(
										moment(task.date, 'D MMM LT').isAfter(moment())
										&& moment(task.date, 'D MMM LT').isBefore(moment().add(5, 'days'))
									)
					}); 

					var communityTasksOverDue = _.filter(communityTasksActive, function (task)
					{
						return moment(task.date, 'D MMM LT').isBefore(moment())
					}); 

					var userData =
					{
						mytasksactive: myTasksActive.length,
						mytasksduesoon: myTasksDueSoon.length,
						mytasksoverdue: myTasksOverDue.length,
						communitytasksactive: communityTasksActive.length,
						communitytasksduesoon: communityTasksDueSoon.length,
						communitytasksoverdue: communityTasksOverDue.length
					};

					_.each(userData, function (value, key)
					{
						if ((key == 'mytasksduesoon' || key == 'communitytasksduesoon') && value != 0)
						{
							userData[key] = '<span style="font-weight:bold; color:#f8ac59; font-size:1.4em;">' + value + '</span>'
						}
						else if ((key == 'mytasksoverdue' || key == 'communitytasksoverdue') && value != 0)
						{
							userData[key] = '<span style="font-weight:bold; color:#ed5565; font-size:1.4em;">' + value + '</span>'
						}
						else
						{
							userData[key] = '<span style="font-weight:bold; font-size:1.4em;">' + value + '</span>'
						}
					});

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
						fromemail: 'journal@ths.community',
						subject: '[journal.ths] What\'s Up?',
						message: message
					});
				});

				entityos.set(
				{
					scope: 'push',
					context: 'messages',
					value: messages
				});

				entityos.invoke('push-send-messages');
			}
		});
	}
}