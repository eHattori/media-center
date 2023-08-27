# Media center

- plex
- qbittorrent
- xteve 
- radarr: for automaticly having movies
- sonarr: for automaticly having tv shows
- Bazarr: is a companion application to Sonarr and Radarr. It can manage and download subtitles based on your requirements.
- jackett:  is a companion application to Sonarr and Radarr. Scraps torrents sites looking for the things that you want
- openvpn

## How to use?

Easy: first copy `.env.sample` to `.env` and fill it with your data. And then run `docker-compose up -d`

Maybe better to add a hostname to your raspi?

`sudo vim /etc/hosts`

```txt
192.168.112.1   media.center
```

- plex [http://media.center:32400/](http://media.center:9117/)
- qbittorrent [http://media.center:8080/](http://media.center:8080/)
- radarr: [http://media.center:6767/](http://media.center:6767/)
- sonarr: [http://media.center:8989/](http://media.center:8989/)
- Bazarr: [http://media.center:6767/](http://media.center:6767/)
- jackett: [http://media.center:9117/](http://media.center:9117/)



