require "application_system_test_case"

class TodoListsTest < ApplicationSystemTestCase
  setup do
    @todo_list = todo_lists(:one)
  end

  test "visiting the index" do
    visit todo_lists_url
    assert_selector "h1", text: "Todo Lists"
  end

  test "creating a Todo list" do
    visit todo_lists_url
    click_on "New Todo List"

    fill_in "Description", with: @todo_list.description
    fill_in "Title", with: @todo_list.title
    click_on "Create Todo list"

    assert_text "Todo list was successfully created"
    click_on "Back"
  end

  test "updating a Todo list" do
    visit todo_lists_url
    click_on "Edit", match: :first

    fill_in "Description", with: @todo_list.description
    fill_in "Title", with: @todo_list.title
    click_on "Update Todo list"

    assert_text "Todo list was successfully updated"
    click_on "Back"
  end

  test "destroying a Todo list" do
    visit todo_lists_url
    page.accept_confirm do
      click_on "Destroy", match: :first
    end

    assert_text "Todo list was successfully destroyed"
  end
end
