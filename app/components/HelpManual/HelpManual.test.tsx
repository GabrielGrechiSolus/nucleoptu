"use client";

import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import HelpManual from "./HelpManual";

describe("HelpManual", () => {
  const title = "Manual de Ajuda";
  const content = <p>Este é o conteúdo do manual.</p>;

  it("should render the help button", () => {
    render(<HelpManual title={title} content={content} />);
    const helpButton = screen.getByTitle("Ajuda / Manual");
    expect(helpButton).toBeInTheDocument();
  });

  it("should open the modal when the help button is clicked", () => {
    render(<HelpManual title={title} content={content} />);
    const helpButton = screen.getByTitle("Ajuda / Manual");
    fireEvent.click(helpButton);

    const modalTitle = screen.getByText(title);
    expect(modalTitle).toBeInTheDocument();

    const modalContent = screen.getByText("Este é o conteúdo do manual.");
    expect(modalContent).toBeInTheDocument();
  });

  it("should close the modal when the close button is clicked", () => {
    render(<HelpManual title={title} content={content} />);
    const helpButton = screen.getByTitle("Ajuda / Manual");
    fireEvent.click(helpButton);

    const closeButton = screen.getByText("Fechar");
    fireEvent.click(closeButton);

    const modalTitle = screen.queryByText(title);
    expect(modalTitle).not.toBeInTheDocument();
  });
});
