package com.dati.backend.controller;

import com.dati.backend.auth.AuthContext;
import com.dati.backend.dto.Requests;
import com.dati.backend.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/pay")
public class PaymentController {
    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/orders")
    public Map<String, Object> createOrder(@Valid @RequestBody Requests.CreateOrder request) {
        return paymentService.createOrder(AuthContext.userId(), request.product());
    }

    @PostMapping("/wechat/notify")
    public Map<String, Object> notify(@RequestBody Map<String, Object> body) {
        String orderNo = String.valueOf(body.get("orderNo"));
        String transactionId = String.valueOf(body.getOrDefault("transactionId", ""));
        return paymentService.notifyPaid(orderNo, transactionId);
    }
}
