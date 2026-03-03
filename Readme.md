 docker run -d --name redirect-redis -p 6379:6379 --network my-net  redis 

 docker run -d --name redirect-rabbitmq -p 5672:5672 -p 15672:15672 --network my-net  rabbitmq:3-management

docker run --name analytics-worker --network my-net   bhagya888/analytics-worker


 docker run --name redirect --network my-net -p 3000:3000 bhagya888/redirect 

