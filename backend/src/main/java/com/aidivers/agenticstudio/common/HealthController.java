package com.aidivers.agenticstudio.common;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.API_V1_PREFIX)
public class HealthController {

    @GetMapping("/health")
    public void health() {}
}