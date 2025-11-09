# hh-questions

Questions and answers on hh.ru

[Русская версия](README.ru.md)

## Questions List

- [A client complains about MySQL database performance issues - simple queries are executing slowly. Describe your actions.](./questions/mysql-performance-troubleshooting/index.md)
- [A client needs help selecting a database server for storing all website activity logs and building diverse analytics on that data. Expected database volume in 6 months is 900 GB. Describe your recommendations for server selection and database configuration for the client?](./questions/database-server-for-logs-analytics/index.md)
- [A client requests a fault-tolerant solution with 99.9% SLA for 7 websites (Nginx, PHP, MySQL, Redis, Memcached), static content occupies 10TB and will grow to 50TB during the year, each database occupies 50GB. Propose a solution and describe the technical implementation.](./questions/fault-tolerant-infrastructure-design/index.md)
- [How would you block requests like "GET /?[a-z]{16} HTTP/1.1" in Nginx?](./questions/nginx-request-blocking/index.md)
- [Is the `iostat -x` command sufficient to assess the real disk load?](./questions/iostat-disk-load-assessment/index.md)
- [Review the bash script](./questions/bash-script-review/index.md)
- [The server has run out of free space, new files cannot be created, but df -h shows that free space is available. Describe the reasons why this could happen.](./questions/disk-space-inodes-issue/index.md)
- [We know there are exactly 7 records with ticket_id=56412. How could the difference in count appear between `=` and `LIKE` queries?](./questions/mysql-ticket-id-count-discrepancy/index.md)
- [What is happening on the server based on the screenshot? Describe in a client-facing response format, and if you have optimization suggestions, please include them.](./questions/server-monitoring-analysis/index.md)
- [What is happening on the server? Describe in the format of a response to the client, and if you have optimization suggestions, also specify them.](./questions/server-performance-analysis/index.md)
- [What is the difference between the commands: "t.sh" ". t.sh" "/t.sh" "./t.sh"?](./questions/shell-script-execution-commands/index.md)
- [Which dependencies (explicit and implicit) are used in this role: rhel_python_sub?](./questions/ansible-role-dependencies/index.md)
- [Which MySQL query is the heaviest and how did you identify it?](./questions/mysql-heaviest-query-identification/index.md)