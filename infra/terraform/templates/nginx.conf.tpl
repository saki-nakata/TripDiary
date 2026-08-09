# /_next/image・/_next/staticのNginx側キャッシュ（実装計画書/phase8.md タスクD）。
# t2.micro（ディスク8GB・空き2GB台）なので上限は控えめに設定する。
# levels=1:2はキャッシュファイルが1ディレクトリに大量に溜まらないようサブディレクトリへ分散する定石。
proxy_cache_path /var/cache/nginx/tripdiary levels=1:2 keys_zone=tripdiary_cache:10m max_size=300m inactive=7d use_temp_path=off;

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

    # sharpによるリサイズ処理が重いため、Nodeプロセスの手前でNginxがキャッシュする
    # （t2.micro 1vCPUでの負荷軽減が主目的。画像のCache-ControlはS3側のヘッダに追従するため
    # 実装計画書/phase8.md タスクB-3でS3側にimmutableを設定済み＝ここでも安全に長くキャッシュできる）。
    location /_next/image {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache tripdiary_cache;
        proxy_cache_valid 200 7d;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        add_header X-Cache-Status $upstream_cache_status always;
    }

    # ビルド成果物（ハッシュ付きファイル名で内容不変）。ブラウザ側も1年キャッシュ済みのため
    # 効果は/_next/imageほど大きくないが、新規訪問者・別ブラウザからのアクセスをNode手前で吸収する。
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache tripdiary_cache;
        proxy_cache_valid 200 7d;
        add_header X-Cache-Status $upstream_cache_status always;
    }
}
