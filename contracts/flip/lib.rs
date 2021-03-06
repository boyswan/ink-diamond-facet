#![cfg_attr(not(feature = "std"), no_std)]
#![feature(min_specialization)]

#[openbrush::contract]
pub mod flip {
    use ink_storage::traits::SpreadAllocate;

    use ink_env::{
        call::{DelegateCall, ExecutionInput, Selector as InkSelector},
        Clear,
    };

    use openbrush::{
        contracts::{ownable::*, psp22::*},
        modifiers,
    };

    #[ink(storage)]
    #[derive(Default, SpreadAllocate, PSP22Storage, OwnableStorage)]
    pub struct Flip {
        #[PSP22StorageField]
        psp22: PSP22Data,
        #[OwnableStorageField]
        ownable: OwnableData,
        // flip: bool,
    }

    impl PSP22 for Flip {}

    impl Ownable for Flip {}

    impl Flip {
        #[ink(constructor)]
        pub fn new() -> Self {
            ink_lang::codegen::initialize_contract(|instance: &mut Flip| {
                instance._init_with_owner(instance.env().caller());
                instance.init_flip().expect("Should initialize");
            })
        }

        #[ink(message)]
        #[modifiers(only_owner)]
        pub fn init_flip(&mut self) -> Result<(), PSP22Error> {
            // self.flip = false;
            Ok(())
        }

        #[ink(message)]
        pub fn get_flip(&mut self) -> bool {
            true
        }

        #[ink(message)]
        pub fn get_balance_of_psp_facet(&mut self, user: AccountId) -> Balance {
            ink_env::debug_println!("Reached: 1");

            let balance = PSP22Ref::balance_of_builder(&Self::env().account_id(), user)
                .call_flags(ink_env::CallFlags::default().set_allow_reentry(true))
                .fire()
                .unwrap();

            ink_env::debug_println!("Reached: 2");
            balance
        }
    }
}
