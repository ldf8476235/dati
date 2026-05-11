package com.dati.backend.service;

import com.dati.backend.auth.JwtService;
import com.dati.backend.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class UserService {
    private final JdbcTemplate jdbc;
    private final JwtService jwtService;
    private final boolean wechatDevMode;
    private final String appId;
    private final String appSecret;

    public UserService(JdbcTemplate jdbc, JwtService jwtService,
                       @Value("${app.wechat.dev-mode}") boolean wechatDevMode,
                       @Value("${app.wechat.app-id}") String appId,
                       @Value("${app.wechat.app-secret}") String appSecret) {
        this.jdbc = jdbc;
        this.jwtService = jwtService;
        this.wechatDevMode = wechatDevMode;
        this.appId = appId;
        this.appSecret = appSecret;
    }

    public Map<String, Object> wechatLogin(String code, String nickname, String avatarUrl) {
        String openid = resolveOpenid(code);
        Long userId = jdbc.query("select id from users where openid = ?", rs -> rs.next() ? rs.getLong(1) : null, openid);
        if (userId == null) {
            String initialNickname = initialNickname(nickname);
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbc.update(con -> {
                PreparedStatement ps = con.prepareStatement("""
                        insert into users(openid, nickname, avatar_url, has_paid) values (?, ?, ?, 0)
                        """, Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, openid);
                ps.setString(2, initialNickname);
                ps.setString(3, avatarUrl);
                return ps;
            }, keyHolder);
            userId = keyHolder.getKey().longValue();
        } else {
            jdbc.update("update users set avatar_url = coalesce(?, avatar_url) where id = ?", avatarUrl, userId);
        }
        Map<String, Object> user = loadUser(userId);
        String token = jwtService.createToken(userId, "user", Boolean.TRUE.equals(user.get("hasPaid")));
        return Map.of("token", token, "user", user);
    }

    public Map<String, Object> loadUser(long userId) {
        return jdbc.queryForObject("""
                select id, nickname, avatar_url, has_paid from users where id = ?
                """, (rs, rowNum) -> Map.of(
                "id", rs.getLong("id"),
                "nickname", rs.getString("nickname") == null ? "" : rs.getString("nickname"),
                "avatarUrl", rs.getString("avatar_url") == null ? "" : rs.getString("avatar_url"),
                "hasPaid", rs.getInt("has_paid") == 1
        ), userId);
    }

    public void requirePaid(long userId) {
        Boolean hasPaid = jdbc.query("select has_paid from users where id = ?",
                rs -> rs.next() && rs.getInt(1) == 1, userId);
        if (!Boolean.TRUE.equals(hasPaid)) {
            throw ApiException.forbidden("请先付款后再答题");
        }
    }

    private String resolveOpenid(String code) {
        if (wechatDevMode || appId.isBlank() || appSecret.isBlank()) {
            return "dev_" + code;
        }
        String url = "https://api.weixin.qq.com/sns/jscode2session?appid={appid}&secret={secret}&js_code={code}&grant_type=authorization_code";
        Map<?, ?> body = new RestTemplate().getForObject(url, Map.class, appId, appSecret, code);
        if (body == null || body.get("openid") == null) {
            throw ApiException.badRequest("微信登录失败");
        }
        return String.valueOf(body.get("openid"));
    }

    private String initialNickname(String nickname) {
        if (nickname != null && !nickname.isBlank() && !"微信用户".equals(nickname.trim())) {
            return nickname.trim();
        }
        int suffix = ThreadLocalRandom.current().nextInt(1000, 10000);
        return "微信用户" + suffix;
    }
}
