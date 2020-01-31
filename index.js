const core = require('@actions/core')
const github = require('@actions/github')
const Youtrack = require('youtrack-rest-client').Youtrack
const rp = require('request-promise')

async function run() {
  try {
    // переменные
    const youtrack_token = core.getInput('youtrack_token', { required: true })
    const repo_token = core.getInput('repo_token', { required: true })
    const youtrack_url = core.getInput('youtrack_url', { required: true })
    const base_url = core.getInput('base_url', { required: true })
    const login = core.getInput('basic_login', { required: true })
    const password = core.getInput('basic_password', { required: true })

    // из пуллреквеста
    const pr_title = github.context.payload.pull_request['title']

    // получаем  taskname из pr_title
    const regex = new RegExp(/^([A-Z]+-\d+)/)
    const taskname = pr_title.match(regex)[1]
    console.log('taskname', taskname)

    // Выгружено на http://ufa.site-368.frfrsite.ru/ и http://bratsk.site-368.frfrsite.ru/
    const remote_url = `http://ufa.${taskname}.${base_url}`
    console.log('remote_url', remote_url)

    // проверяем что ветка выгрузилась
    await rp(remote_url, {
      auth: {
        user: login,
        pass: password,
        sendImmediately: false,
      },
    }).catch(() => {
      throw new Error(`По адресу ${remote_url} ошибка`)
    })

    // если ветка не выгрузилась - роняем action

    const message = `Выгружено на ${remote_url}`
    console.log('message', message)

    // отправляем на youtrack сообщение о статусе ветки
    const youtrack = new Youtrack({
      baseUrl: youtrack_url,
      token: youtrack_token,
    })
    const issue = await youtrack.issues.byId(taskname)
    console.log('issue', issue)

    await youtrack.comments.create(issue.task_id, { text: message })

    // отсылка на гитхаб
    const client = new github.GitHub(repo_token)
    await client.issues.createComment({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: github.context.payload.pull_request.number,
      body: message,
    })
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
