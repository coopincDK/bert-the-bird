using UnityEngine;
using System.Collections;

public class LeaderBoardLevelSelector : MonoBehaviour {
	public UIGrid Grid;
	public GameObject LevelItem;
	public UIScrollView scrollview;


	void Start () {
		foreach (LevelObject lev in Level.Control.Levels) {
			if (lev.ID != 0) {
				GameObject item = NGUITools.AddChild(Grid.gameObject, LevelItem);
				item.GetComponent<LeaderBoardLevelItem>().LevelID = lev.ID;
				item.GetComponent<LeaderBoardLevelItem>().Refresh();
				item.name = lev.ID.ToString("D" + 4); //"0050"
			}
		}
		Grid.sorting = UIGrid.Sorting.Alphabetic;
		Grid.repositionNow = true;
		scrollview.ResetPosition ();
	}

	public void Show () {
		NGUITools.SetActive (gameObject, true);
	}

	public void Hide () {
		NGUITools.SetActive (gameObject, false);
	}
}
