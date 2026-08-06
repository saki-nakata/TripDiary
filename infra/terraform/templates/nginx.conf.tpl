server {
    # default_server が必須: AL2023のnginxパッケージは /etc/nginx/nginx.conf 内に
    # 「listen 80; server_name _; root /usr/share/nginx/html;」という組み込みのデフォルト
    # serverブロックを持ち、conf.d/*.conf より先に読み込まれる。default_serverを明示しないと
    # そちらが暗黙のデフォルトとして勝ち、この設定（プロキシ）が無視される
    # （実機確認済み。"conflicting server name "_" ... ignored" 警告と、リバースプロキシが
    # 効かずnginxのウェルカムページが200で返る事象で発覚）。
    # IPv4/IPv6両方をdefault_serverにする。実機確認で、IPv4(listen 80)のみdefault_server化しても
    # "localhost"がIPv6([::1])に解決される経路（curl http://localhost/ 等、本READMEのデプロイ後
    # 動作確認で使用）では組み込みのデフォルトserverブロックに戻ってしまうことを確認した。
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    # 投稿画像10MB・アバター5MBの実際の上限(src/lib/services/upload.service.ts、
    # src/app/api/upload/avatar/route.ts)に対し、multipartオーバーヘッド分の余裕を確保する。
    client_max_body_size 12m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        # appendではなく上書き。src/lib/rate-limit.ts の getClientIp は
        # X-Forwarded-For の最左値を無条件に信頼するため、ここで上書きしないと
        # クライアントが任意の値を送り込みIPベースのレート制限を回避できてしまう(GATE-20)。
        proxy_set_header X-Forwarded-For $remote_addr;
        # HTTPS非採用のため常時 http（src/lib/auth.ts の trustHost: true との整合を保つ）。
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
