package com.aidivers.agenticstudio.tools;

public enum ToolType {
    WEB_SEARCH("Веб пошук"),
    HTTP_REQUEST("HTTP запит"),
    DATABASE_QUERY("Пошук в базі даних");
    public final String name;
    ToolType(String name) {
        this.name = name;
    }
}