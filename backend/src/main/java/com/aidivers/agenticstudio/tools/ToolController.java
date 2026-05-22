package com.aidivers.agenticstudio.tools;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ToolController {

    private final AgentToolService agentToolService;
    private final ObjectMapper objectMapper;

    @GetMapping("/tool-types")
    public ToolTypesResponse getToolTypes() {
        return ToolTypesResponse.builder()
                .categories(List.of(
                        category(
                                "education",
                                "Освіта",
                                "Tools for learning assistants, course search, tutoring, and knowledge lookup.",
                                List.of(
                                        tool(
                                                ToolType.COURSE_SEARCH,
                                                "Шукає навчальні курси за темою або навичкою.",
                                                "education",
                                                Map.<String, Object>of(
                                                        "query", "string",
                                                        "level", "string",
                                                        "max_results", "integer"
                                                )
                                        ),
                                        tool(
                                                ToolType.COURSE_INFO,
                                                "Повертає детальну інформацію про конкретний курс.",
                                                "education",
                                                Map.<String, Object>of("course_id", "string")
                                        ),
                                        tool(
                                                ToolType.SAVE_PROGRESS,
                                                "Зберігає прогрес студента по уроку.",
                                                "education",
                                                Map.<String, Object>of(
                                                        "user_id", "string",
                                                        "course_id", "string",
                                                        "lesson_id", "string"
                                                )
                                        )
                                )
                        ),
                        category(
                                "tourism",
                                "Туризм",
                                "Tools for travel research, destinations, routes, and recommendations.",
                                List.of(
                                        tool(
                                                ToolType.HOTEL_SEARCH,
                                                "Шукає готелі в місті за датами заїзду та виїзду.",
                                                "tourism",
                                                Map.<String, Object>of(
                                                        "city", "string",
                                                        "check_in", "string",
                                                        "check_out", "string",
                                                        "guests", "integer"
                                                )
                                        ),
                                        tool(
                                                ToolType.ITINERARY_PLAN,
                                                "Складає детальний план подорожі по місту або країні.",
                                                "tourism",
                                                Map.<String, Object>of(
                                                        "destination", "string",
                                                        "days", "integer",
                                                        "interests", "string"
                                                )
                                        ),
                                        tool(
                                                ToolType.GET_WEATHER,
                                                "Повертає прогноз погоди для міста на кілька днів.",
                                                "tourism",
                                                Map.<String, Object>of(
                                                        "city", "string",
                                                        "days", "integer"
                                                )
                                        )
                                )
                        ),
                        category(
                                "ecommerce",
                                "E-commerce (Продажі)",
                                "Tools for product lookup, order status, sales workflows, and customer requests.",
                                List.of(
                                        tool(
                                                ToolType.PRODUCT_SEARCH,
                                                "Шукає товари за назвою або категорією.",
                                                "ecommerce",
                                                Map.<String, Object>of(
                                                        "query", "string",
                                                        "category", "string",
                                                        "max_results", "integer"
                                                )
                                        ),
                                        tool(
                                                ToolType.ORDER_STATUS,
                                                "Перевіряє статус і трекінг замовлення.",
                                                "ecommerce",
                                                Map.<String, Object>of("order_id", "string")
                                        ),
                                        tool(
                                                ToolType.CHECK_PRICE,
                                                "Повертає ціну і наявність конкретного товару.",
                                                "ecommerce",
                                                Map.<String, Object>of("product_id", "string")
                                        )
                                )
                        ),
                        category(
                                "general",
                                "Інше",
                                "General tools for tasks that do not fit the main categories yet.",
                                List.of(
                                        tool(
                                                ToolType.GET_CURRENT_TIME,
                                                "Повертає поточну дату і час.",
                                                "general",
                                                Map.<String, Object>of("timezone", "string")
                                        ),
                                        tool(
                                                ToolType.WEB_SEARCH,
                                                "Шукає актуальну інформацію в інтернеті.",
                                                "general",
                                                Map.<String, Object>of(
                                                        "query", "string",
                                                        "max_results", "integer"
                                                )
                                        ),
                                        tool(
                                                ToolType.SAVE_NOTE,
                                                "Зберігає нотатку для поточної сесії.",
                                                "general",
                                                Map.<String, Object>of(
                                                        "session_id", "string",
                                                        "content", "string"
                                                )
                                        ),
                                        tool(
                                                ToolType.HTTP_REQUEST,
                                                "Виконує HTTP запит до зовнішнього API.",
                                                "general",
                                                Map.<String, Object>of(
                                                        "url", "string",
                                                        "method", "string",
                                                        "headers", "object",
                                                        "body", "string"
                                                )
                                        )
                                )
                        )
                ))
                .build();
    }

    @PostMapping("/agents/{agentId}/tools")
    @ResponseStatus(HttpStatus.CREATED)
    public AgentToolResponse addTool(@PathVariable UUID agentId,
                                     @Valid @RequestBody AgentToolRequest request) {
        try {
            AgentTool tool = new AgentTool();
            ToolType type = ToolType.fromId(request.getType());
            tool.setType(type);
            tool.setName(request.getName());
            tool.setEnabled(request.isEnabled());

            if (request.getConfig() != null) {
                tool.setConfigJson(request.getConfig());
            } else if (request.getConfigJson() != null && !request.getConfigJson().isBlank()) {
                Map<String, Object> configMap = objectMapper.readValue(
                        request.getConfigJson(),
                        new TypeReference<Map<String, Object>>() {}
                );
                tool.setConfigJson(configMap);
            }

            AgentTool savedTool = agentToolService.save(agentId, tool);

            String responseConfig = null;
            if (savedTool.getConfigJson() != null) {
                responseConfig = objectMapper.writeValueAsString(savedTool.getConfigJson());
            }

            return AgentToolResponse.builder()
                    .id(savedTool.getId())
                    .agentId(savedTool.getAgent().getId())
                    .type(savedTool.getType().getId())
                    .category(resolveCategory(request.getCategory(), savedTool.getType()))
                    .name(savedTool.getName())
                    .config(savedTool.getConfigJson() == null ? Map.of() : savedTool.getConfigJson())
                    .configJson(responseConfig)
                    .enabled(savedTool.isEnabled())
                    .createdAt(savedTool.getCreatedAt())
                    .build();

        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Невідомий тип інструмента: " + request.getType());
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Помилка формату configJson. Очікується валідний JSON.");
        }
    }

    private String resolveCategory(String requestedCategory, ToolType type) {
        if (requestedCategory != null && !requestedCategory.isBlank()) {
            return requestedCategory;
        }
        return type.getCategory();
    }

    private ToolCategoryResponse category(String id, String label, String description, List<ToolTemplateResponse> tools) {
        return ToolCategoryResponse.builder()
                .id(id)
                .label(label)
                .description(description)
                .tools(tools)
                .build();
    }

    private ToolTemplateResponse tool(ToolType type, String description, String category, Map<String, Object> configSchema) {
        return ToolTemplateResponse.builder()
                .type(type.getId())
                .name(type.name)
                .description(description)
                .category(category)
                .requiresHumanConfirmation(requiresHumanConfirmation(type))
                .configSchema(configSchema)
                .build();
    }

    private boolean requiresHumanConfirmation(ToolType type) {
        return type == ToolType.HTTP_REQUEST
                || type == ToolType.SAVE_PROGRESS
                || type == ToolType.SAVE_NOTE;
    }
}
