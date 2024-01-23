@editor  @tiny @editor_tiny  @tiny_codepro
Feature: Tiny code pro editor
  Open the code pro editor
  Background:
    Given the following "courses" exist:
        | shortname | fullname |
        | C1        | Course 1 |
    And the following "users" exist:
        | username | firstname | lastname | email                |
        | teacher1 | Teacher   | 1        | teacher1@example.com |
    And the following "course enrolments" exist:
        | user     | course | role           |
        | teacher1 | C1     | editingteacher |
    And the following "activities" exist:
        | activity | name      | intro     | introformat | course | contentformat | idnumber |
        | page     | PageName1 | PageDesc1 | 1           | C1     | 1             | 1        |
  @javascript @external
  Scenario: TinyMCE can open the code pro editor
    And I am on the PageName1 "page activity editing" page logged in as admin
    And I click on the "Source code Pro" button for the "Page content" TinyMCE editor
    And I should see "Source code Pro"
    And I fill in "tiny_codepro-editor-area" with "<h1>Hello Tiny!</h1>"
    And I press "Save"
    And I should see "Hello Tiny!"
    