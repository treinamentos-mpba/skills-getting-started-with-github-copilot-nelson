document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const signupButton = document.getElementById("signup-button");
  const emailInput = document.getElementById("email");
  let activitiesAvailable = false;
  let messageTimeout;

  async function fetchActivities() {
    activitiesList.setAttribute("aria-busy", "true");
    activitiesList.replaceChildren(createTextElement("p", "loading-state", "Carregando atividades..."));
    signupButton.disabled = true;

    try {
      const response = await fetch("/activities");
      if (!response.ok) {
        throw new Error(`Falha ao carregar atividades (${response.status})`);
      }

      const activities = await response.json();
      const entries = Object.entries(activities);

      activitiesList.replaceChildren();
      activitySelect.replaceChildren(new Option("Selecione uma atividade", ""));
      activitiesAvailable = entries.length > 0;

      if (!activitiesAvailable) {
        activitiesList.append(createTextElement("p", "empty-state", "Nenhuma atividade disponível no momento."));
      }

      entries.forEach(([name, details]) => {
        const activityCard = document.createElement("article");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const isFull = spotsLeft <= 0;
        const cardContent = document.createElement("div");
        const title = createTextElement("h3", "", name);
        const description = createTextElement("p", "", details.description);
        const metadata = document.createElement("div");
        metadata.className = "activity-meta";

        cardContent.append(title, description);
        metadata.append(
          createTextElement("span", "", `◷ ${details.schedule}`),
          createTextElement(
            "span",
            `availability${isFull ? " full" : ""}`,
            isFull ? "● Sem vagas" : `● ${spotsLeft} ${spotsLeft === 1 ? "vaga disponível" : "vagas disponíveis"}`
          )
        );
        activityCard.append(cardContent);

        const chooseButton = document.createElement("button");
        chooseButton.className = "activity-action";
        chooseButton.type = "button";
        chooseButton.textContent = isFull ? "Lotada" : "Quero participar";
        chooseButton.disabled = isFull;
        chooseButton.setAttribute("aria-label", `${chooseButton.textContent}: ${name}`);
        chooseButton.addEventListener("click", () => {
          activitySelect.value = name;
          emailInput.focus();
          document.getElementById("signup-container").scrollIntoView({ behavior: "smooth", block: "center" });
        });

        activityCard.append(chooseButton, metadata);
        activitiesList.append(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        option.disabled = isFull;
        activitySelect.appendChild(option);
      });

      signupButton.disabled = !activitiesAvailable;
      activitiesList.setAttribute("aria-busy", "false");
    } catch (error) {
      activitiesAvailable = false;
      const errorState = document.createElement("p");
      errorState.className = "error-state";
      errorState.append("Não foi possível carregar as atividades. ");

      const retryButton = document.createElement("button");
      retryButton.className = "retry-button";
      retryButton.type = "button";
      retryButton.textContent = "Tentar novamente";
      retryButton.addEventListener("click", fetchActivities);
      errorState.append(retryButton);

      activitiesList.replaceChildren(errorState);
      activitiesList.setAttribute("aria-busy", "false");
      signupButton.disabled = true;
      console.error("Erro ao carregar atividades:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value;
    const activity = activitySelect.value;
    signupButton.disabled = true;
    signupButton.querySelector("span:first-child").textContent = "Enviando...";

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        await fetchActivities();
      } else {
        showMessage(result.detail || "Não foi possível concluir sua inscrição.", "error");
      }
    } catch (error) {
      showMessage("Não foi possível concluir sua inscrição. Tente novamente.", "error");
      console.error("Erro ao realizar inscrição:", error);
    } finally {
      signupButton.querySelector("span:first-child").textContent = "Fazer inscrição";
      signupButton.disabled = !activitiesAvailable;
    }
  });

  function showMessage(message, type) {
    window.clearTimeout(messageTimeout);
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageTimeout = window.setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function createTextElement(tagName, className, text) {
    const element = document.createElement(tagName);
    element.className = className;
    element.textContent = text;
    return element;
  }

  fetchActivities();
});
