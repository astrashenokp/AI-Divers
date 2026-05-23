package com.aidivers.agenticstudio.common;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(ApiConstants.API_V1_PREFIX)
public class RuntimeMetadataController {

    @GetMapping("/domains")
    public Map<String, Object> domains() {
        return Map.of("domains", List.of(
                Map.of("id", "ecommerce", "label", "E-commerce"),
                Map.of("id", "education", "label", "Education"),
                Map.of("id", "tourism", "label", "Tourism"),
                Map.of("id", "general", "label", "General")
        ));
    }

    @GetMapping("/guardrails-config")
    public Map<String, Object> guardrailsConfig() {
        Map<String, Integer> domainMaxSteps = new LinkedHashMap<>();
        domainMaxSteps.put("ecommerce", 8);
        domainMaxSteps.put("education", 10);
        domainMaxSteps.put("tourism", 10);
        domainMaxSteps.put("general", 6);

        Map<String, List<String>> domainToolAllowlists = new LinkedHashMap<>();
        domainToolAllowlists.put("ecommerce", List.of(
                "get_current_time",
                "search_web",
                "save_note",
                "http_request",
                "product_search",
                "order_status",
                "check_price"
        ));
        domainToolAllowlists.put("education", List.of(
                "get_current_time",
                "search_web",
                "save_note",
                "http_request",
                "course_search",
                "course_info",
                "save_progress"
        ));
        domainToolAllowlists.put("tourism", List.of(
                "get_current_time",
                "search_web",
                "save_note",
                "http_request",
                "hotel_search",
                "itinerary_plan",
                "get_weather"
        ));
        domainToolAllowlists.put("general", List.of(
                "get_current_time",
                "search_web",
                "save_note",
                "http_request"
        ));

        return Map.of(
                "valid_domains", List.of("ecommerce", "education", "tourism", "general"),
                "default_max_steps", 10,
                "default_timeout_seconds", 30,
                "domain_max_steps", domainMaxSteps,
                "tools_requiring_confirmation", List.of("http_request", "save_progress", "save_note"),
                "domain_tool_allowlists", domainToolAllowlists
        );
    }
}
