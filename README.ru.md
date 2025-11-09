# hh-questions

Вопросы и ответы с hh.ru

[English version](README.md)

## Список вопросов

- [Какие зависимости (явные и неявные) используются в этой роли: rhel_python_sub?](./questions/ansible-role-dependencies/index.ru.md)
- [Проведите ревью bash-скрипта](./questions/bash-script-review/index.ru.md)
- [Клиент просит подобрать сервер под базу данных для хранения логов всех действий на сайте и строить разнообразную аналитику по данным. Ожидаемый объем БД через 6 месяцев 900 ГБ. Опишите ваши рекомендации по выбору сервера и настройке БД для клиента?](./questions/database-server-for-logs-analytics/index.ru.md)
- [На сервере закончилось свободное место, новые файлы не создаются, вывод df -h показывает что свободное место есть. Опишите причины по которым такое могло произойти?](./questions/disk-space-inodes-issue/index.ru.md)
- [Клиент просит подобрать отказоустойчивое решение с SLA 99.9% для 7 сайтов (Nginx, PHP, MySQL, Redis, Memcached), статика занимает 10ТБ и будет расти до 50ТБ в течении года, каждая БД занимает 50ГБ. Предложите решение, опишите для клиента техническую реализацию.](./questions/fault-tolerant-infrastructure-design/index.ru.md)
- [Достаточно ли команды iostat -x чтобы оценить реальную нагрузку на диск?](./questions/iostat-disk-load-assessment/index.ru.md)
- [Какой из запросов MySQL самый тяжелый и как вы его выявили?](./questions/mysql-heaviest-query-identification/index.ru.md)
- [Клиент жалуется на проблемы в работе БД MySQL - простые запросы выполняются медленно. Опишите ваши действия.](./questions/mysql-performance-troubleshooting/index.ru.md)
- [Расскажите, каким образом вы будете блокировать в Nginx запросы вида "GET /?[a-z]{16} HTTP/1.1"?](./questions/nginx-request-blocking/index.ru.md)
- [Что происходит на сервере? Опишите в формате ответа для клиента, если у вас есть предложения по оптимизации, также укажите их.](./questions/server-performance-analysis/index.ru.md)
- [Что происходит на сервере по скриншоту? Опишите в формате ответа для клиента, если у вас есть предложения по оптимизации, также укажите их.](./questions/server-monitoring-analysis/index.ru.md)
- [Расскажите, чем отличаются команды: "t.sh" ". t.sh" "/t.sh" "./t.sh"?](./questions/shell-script-execution-commands/index.ru.md)
