package com.dati.backend.service;

import com.dati.backend.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentService {
    private final JdbcTemplate jdbc;
    private final int amount;

    public PaymentService(JdbcTemplate jdbc, @Value("${app.product.full-access-amount}") int amount) {
        this.jdbc = jdbc;
        this.amount = amount;
    }

    public Map<String, Object> createOrder(long userId, String product) {
        if (!"full_access".equals(product)) {
            throw ApiException.badRequest("未知商品");
        }
        String orderNo = DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS").format(LocalDateTime.now()) + userId;
        jdbc.update("insert into orders(user_id, order_no, amount, status) values (?, ?, ?, 'pending')",
                userId, orderNo, amount);
        Map<String, String> devPayParams = Map.of(
                "timeStamp", String.valueOf(System.currentTimeMillis() / 1000),
                "nonceStr", UUID.randomUUID().toString().replace("-", ""),
                "package", "prepay_id=DEV_PREPAY_" + orderNo,
                "signType", "RSA",
                "paySign", "DEV_PAY_SIGN"
        );
        return Map.of("orderNo", orderNo, "payParams", devPayParams);
    }

    @Transactional
    public Map<String, Object> notifyPaid(String orderNo, String transactionId) {
        Map<String, Object> order = jdbc.query("select id, user_id, status from orders where order_no = ?",
                rs -> rs.next() ? Map.of("id", rs.getLong("id"), "userId", rs.getLong("user_id"), "status", rs.getString("status")) : null,
                orderNo);
        if (order == null) {
            throw ApiException.notFound("订单不存在");
        }
        if (!"paid".equals(order.get("status"))) {
            jdbc.update("update orders set status = 'paid', wechat_transaction_id = ?, paid_at = now() where id = ?",
                    transactionId, order.get("id"));
            jdbc.update("update users set has_paid = 1, paid_at = now() where id = ?", order.get("userId"));
        }
        return Map.of("code", "SUCCESS", "message", "成功");
    }
}
