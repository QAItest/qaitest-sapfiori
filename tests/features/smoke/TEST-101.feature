@TEST-101 @smoke @sap-fiori @env_ui
Feature: SAP Fiori application availability
  As a delivery team
  I want to verify that the Fiori application exposes a working UI5 runtime
  So that deeper business journeys can run reliably

  Scenario: The Fiori application starts and renders UI5 controls
    Given I open the SAP Fiori application
    Then the UI5 runtime should be available
    And at least one UI5 control of type "sap.m.SearchField" should exist
