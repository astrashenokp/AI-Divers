package com.aidivers.agenticstudio.tools;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ToolType {
    GET_CURRENT_TIME("get_current_time", "Поточний час"),
    WEB_SEARCH("search_web", "Веб пошук"),
    SAVE_NOTE("save_note", "Зберегти нотатку"),
    HTTP_REQUEST("http_request", "HTTP запит"),

    PRODUCT_SEARCH("product_search", "Пошук товарів"),
    ORDER_STATUS("order_status", "Статус замовлення"),
    CHECK_PRICE("check_price", "Перевірка ціни"),

    COURSE_SEARCH("course_search", "Пошук курсів"),
    COURSE_INFO("course_info", "Інформація про курс"),
    SAVE_PROGRESS("save_progress", "Зберегти прогрес"),

    HOTEL_SEARCH("hotel_search", "Пошук готелів"),
    ITINERARY_PLAN("itinerary_plan", "План подорожі"),
    GET_WEATHER("get_weather", "Прогноз погоди"),

    DATABASE_QUERY("database_query", "Пошук в базі даних");

    public final String name;
    private final String id;

    ToolType(String id, String name) {
        this.id = id;
        this.name = name;
    }

    @JsonValue
    public String getId() {
        return id;
    }

    @JsonCreator
    public static ToolType fromId(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Tool type is required");
        }

        String normalized = normalizeAlias(value.trim());
        for (ToolType type : values()) {
            if (type.id.equalsIgnoreCase(normalized) || type.name().equalsIgnoreCase(normalized)) {
                return type;
            }
        }

        throw new IllegalArgumentException("Unknown tool type: " + value);
    }

    private static String normalizeAlias(String value) {
        return switch (value.toLowerCase()) {
            case "web_search" -> "search_web";
            case "current_time" -> "get_current_time";
            default -> value;
        };
    }
}
