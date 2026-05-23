import logging

from langgraph.graph import END, StateGraph

from agents.agent_state import AgentState
from agents.domains.graph import create_domain_graph
from agents.router.router import router_node

logger = logging.getLogger(__name__)

# ── Pre-compile subgraphs ─────────────────────────────────────────────────────

_education_graph = create_domain_graph("education")
_ecommerce_graph = create_domain_graph("ecommerce")
_tourism_graph = create_domain_graph("tourism")
_general_graph = create_domain_graph("general")


def _route_after_router(state: AgentState) -> str:
    domain = state.get("domain", "general")
    if domain not in {"education", "ecommerce", "tourism", "general"}:
        domain = "general"
    return domain


def create_main_graph() -> StateGraph:
    builder = StateGraph(AgentState)

    builder.add_node("router", router_node)
    builder.add_node("education", _education_graph)
    builder.add_node("ecommerce", _ecommerce_graph)
    builder.add_node("tourism", _tourism_graph)
    builder.add_node("general", _general_graph)

    builder.set_entry_point("router")

    builder.add_conditional_edges(
        "router",
        _route_after_router,
        {
            "education": "education",
            "ecommerce": "ecommerce",
            "tourism": "tourism",
            "general": "general",
        },
    )

    builder.add_edge("education", END)
    builder.add_edge("ecommerce", END)
    builder.add_edge("tourism", END)
    builder.add_edge("general", END)

    return builder.compile()


# ── Singleton instance ────────────────────────────────────────────────────────

agent_graph = create_main_graph()
